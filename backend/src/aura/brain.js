
// Handles the Gemini tool-calling loop (capped to 5 steps, with strict server-enforced sessionId).

import { GoogleGenerativeAI } from "@google/generative-ai";
import { toolMap, TOOL_DECLARATIONS } from "./toolRegistry.js";
import { config } from "../config/config.js";
import { detectUserLanguage, extractFoodItems } from "./voiceTurnHandler.js";

// NOTE: genAI is intentionally NOT created at module load time.
// config reads .env with override:true so it must be read after dotenv runs.
// We create a fresh GoogleGenerativeAI instance per-request in runBrain().

const SYSTEM_PROMPT = `You are Aura, the ultra-fast friendly voice assistant for the Dropp super-app (Food Delivery & Ride Hailing).
Your voice output will be read aloud to the user through text-to-speech.

LANGUAGE & PRONUNCIATION RULES:
1. Match the user's spoken language:
   - If the user speaks in English: reply in natural Indian English (say "rupees", say numbers in English like "two coffees").
   - If the user speaks in Hindi or Hinglish: reply in warm, natural everyday conversational Hinglish (say "rupaye", say numbers like "do coffee").
2. CURRENCY & NUMBERS:
   - In Hindi/Hinglish: ALWAYS say "rupaye" (e.g. "250 rupaye"). Use natural quantities: "ek", "do", "teen".
   - In English: ALWAYS say "rupees" (e.g. "250 rupees"). Use natural quantities: "one", "two", "three".
   - NEVER use currency symbols like ₹.
3. NEVER use markdown symbols like **, *, _, #, bullets, or dashes. Plain conversational text only.
4. NEVER use emojis in replies because the text-to-speech engine reads them aloud awkwardly.
5. NEVER speak postal addresses, road numbers, PIN codes (like 560049, 560035), or "India". ALWAYS speak short, clean landmark/city names (e.g. "Bengaluru Airport", "Railway Station", "Cyber Hub").
6. Keep replies strictly under 10 to 14 words. Be ultra-punchy, brief, and direct.

FOOD ORDERING RULES:
7. When the user specifies dishes/items to order (e.g. "do coffee, ek dosa aur ek chai order kar do" or "order 2 coffees and 1 pizza"):
   - IMMEDIATELY call "search_restaurants" to find the restaurant, AND IMMEDIATELY call "build_draft" in the SAME turn!
   - NEVER stop after searching restaurants.
   - NEVER ask "what would you like to order?" or "kya order karna chahenge" when the user ALREADY told you what they want!
   - In your reply, state the restaurant name, item quantities, and total amount, and ask for confirmation to place the order.
8. ONLY show the restaurant list (without calling build_draft) if the user explicitly asks to explore or discover without naming dishes (e.g. "show cafes near me" or "restaurants dikhao").

RIDE HAILING RULES:
9. When the user asks for a ride, cab, auto, or bike, call "estimate_ride". State pickup, drop, and fare, and ask for confirmation.
10. When the user confirms (e.g. "Haan cab book kardo"), call "book_ride" with quoteId and rideType. Once booked, announce driver name and 4-digit OTP.

MULTI-INTENT RULES (RIDE + FOOD IN ONE UTTERANCE):
11. When the user asks for BOTH a ride and food (e.g. "Book a cab from X to Y and also order 2 coffee and 1 pizza"):
    - You MUST call BOTH "estimate_ride" and "search_restaurants" + "build_draft".
    - In your reply, announce the short route & cab fare, and food items & total.
    - Ask: "Dono confirm kar doon?" (or in English: "Should I confirm both?").

ORDER STATUS RULES:
12. When the user asks where their order is, immediately call "get_order_status". State the spokenStatus returned by the tool.`;

const MAX_STEPS = 4;
const MODEL_TIMEOUT_MS = 3500;
const COOLDOWN_MS = 5_000;

// Helper: extract short friendly location name without postal address or pincode
function shortPlace(raw, originalInput) {
  if (originalInput && originalInput.length >= 3 && originalInput.length <= 40) {
    return originalInput.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return String(raw || '')
    .replace(/,\s*\d{6}\b/g, '')
    .replace(/,\s*India\b/gi, '')
    .split(',')[0]
    .trim();
}

// CIRCUIT breaker after a provider failure, skip Gemini for a while
let geminiCooldownUntil = 0;

const withTimeout = (promise, ms = MODEL_TIMEOUT_MS) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

// Only provider/network problems should trigger the fallback.
const isProviderError = (err) =>
  /429|quota|rate|503|500|502|504|timeout|fetch failed|network|ENOTFOUND|ECONN|overloaded|unavailable|not found/i.test(
    String(err?.message ?? '')
  );

// Ensures history starts with user, strictly alternates, and ends with model
function cleanHistory(history) {
  const h = [];
  let expectedRole = 'user';
  for (const turn of history || []) {
    if (!turn?.parts?.[0]?.text) continue;
    if (turn.role === expectedRole) {
      h.push(turn);
      expectedRole = expectedRole === 'user' ? 'model' : 'user';
    }
  }
  // History passed to startChat must end with model so the next sendMessage is user
  while (h.length && h[h.length - 1].role !== 'model') {
    h.pop();
  }
  return h;
}

// Tier 2: Deterministic fallback for when Gemini is offline or rate-limited
async function runDeterministicFallback({ text, sessionId }) {
  const clean = String(text ?? '')
    .toLowerCase()
    .replace(/[.,!?;]+$/g, '')
    .trim();

  const isEnglish =
    !/[\u0900-\u097F]/.test(clean) &&
    !/\b(kya|hai|hain|hoon|chahiye|karo|bhai|dhoondh|mila|mile|rupaye|dekho|dikhao|batao|kiska|aapka|aur|kuch|theek|haan|nahi|karna|le|lo)\b/i.test(clean);

  // ── 0. Check for Order Status Intent in Fallback ──
  const isStatusQuery = /\b(order\s*(?:kahan|status|kab|kidhar|kaisa|update)|kahan\s*hai\s*order|track\s*order|where\s*is\s*my\s*order)\b/i.test(clean);
  if (isStatusQuery) {
    try {
      const statusRes = await toolMap.get_order_status({ sessionId });
      if (statusRes.found) {
        return {
          reply: statusRes.spokenStatus,
          toolCallsMade: ['get_order_status'],
          screenAction: { type: 'SHOW_ORDER_STATUS', data: statusRes },
        };
      }
      return {
        reply: isEnglish ? 'You do not have any active orders right now.' : 'Aapka koi active order nahi mila.',
        toolCallsMade: ['get_order_status'],
        screenAction: null,
      };
    } catch (_) {}
  }

  // ── 1. Check for Ride Intent in Fallback ──
  const isRideRequest = /\b(cab|ride|auto|taxi|bike|gaadi|jana hai|jaana hai|dropp go|book.*ride|ride.*book)\b/i.test(clean);
  const hasFoodInSameUtterance = /\b(coffee|pizza|biryani|chai|tea|burger|food|khana)\b/i.test(clean);

  if (isRideRequest) {
    let pickup = null;
    let drop = null;

    // Pattern A: "from X to Y" (English / Hinglish)
    const fromToMatch = clean.match(/(?:from\s+)(.+?)\s+(?:to\s+)(.+?)(?=\s+(?:and|aur|mein|par|chahiye|please|order|bhi|\d)|$)/i);
    if (fromToMatch) {
      pickup = fromToMatch[1].trim();
      drop = fromToMatch[2].trim();
    } else {
      // Pattern B: "X se Y ke liye" or "X se Y tak"
      const seTakMatch = clean.match(/(?:(?:book|order|chahiye|mujhe|humein|mera|ab)?\s*)(.+?)\s+se\s+(.+?)(?=\s+(?:ke\s+liye|tak|cab|ride|book|jaana|jana|and|aur|order)|\s*$)/i);
      if (seTakMatch) {
        const noiseWords = /\b(cab|ride|auto|book|chahiye|mujhe|aur|ab|ek|mera|please|order|kar do|karo)\b/gi;
        pickup = seTakMatch[1].replace(noiseWords, '').trim();
        drop = seTakMatch[2].replace(noiseWords, '').trim();
      }
    }

    if (pickup && drop) {
      try {
        const estimate = await toolMap.estimate_ride({ pickup, drop, sessionId });
        const cabFare = (estimate.fares || []).find((f) => f.type === 'cab_economy')?.fare || 150;
        const pickName = shortPlace(estimate.pickup.address, pickup);
        const dropName = shortPlace(estimate.drop.address, drop);

        // ── Multi-Intent: also build food draft if mentioned in same utterance ──
        if (hasFoodInSameUtterance) {
          try {
            const foodQuery = clean.includes('coffee') ? 'coffee' : clean.includes('pizza') ? 'pizza' : clean.includes('biryani') ? 'biryani' : 'food';
            const restResult = await toolMap.search_restaurants({ query: foodQuery, sessionId });
            const rest = (restResult.items ?? [])[0];

            if (rest) {
              const itemsToAdd = [];
              const parseQty = (pat) => {
                const m = clean.match(new RegExp(`(\\d+|do|teen|char|paanch|ek|two|three|four|one)\\s+(?:${pat})`, 'i'));
                if (!m) return 1;
                const w = m[1].toLowerCase();
                return ({ do: 2, two: 2, teen: 3, three: 3, char: 4, four: 4, paanch: 5, five: 5, ek: 1, one: 1 }[w] ?? parseInt(w, 10)) || 1;
              };
              if (/coffee/i.test(clean)) itemsToAdd.push({ name: 'Cold Coffee', quantity: parseQty('coffee') });
              if (/chai|tea/i.test(clean)) itemsToAdd.push({ name: 'Masala Chai', quantity: parseQty('chai|tea') });
              if (/pizza/i.test(clean)) itemsToAdd.push({ name: 'Margherita Pizza', quantity: parseQty('pizza') });
              if (/biryani/i.test(clean)) itemsToAdd.push({ name: 'Veg Dum Biryani', quantity: parseQty('biryani') });
              if (/burger/i.test(clean)) itemsToAdd.push({ name: 'Crispy Veg Burger', quantity: parseQty('burger') });
              if (itemsToAdd.length === 0) itemsToAdd.push({ name: 'Cold Coffee', quantity: 1 });

              const draft = await toolMap.build_draft({
                restaurantId: rest._id || rest.id,
                items: itemsToAdd,
                sessionId,
              });

              const itemSummary = itemsToAdd.map((i) => `${i.quantity} ${i.name}`).join(' aur ');
              const reply = isEnglish
                ? `Cab from ${pickName} to ${dropName} is ${cabFare} rupees, and ${itemSummary} added for ${draft.totalAmount} rupees. Confirm both?`
                : `${pickName} se ${dropName} cab ${cabFare} rupaye, aur ${itemSummary} ${draft.totalAmount} rupaye add ho gaya. Dono confirm kar doon?`;

              return {
                reply,
                toolCallsMade: ['estimate_ride', 'search_restaurants', 'build_draft'],
                screenAction: {
                  type: 'MULTI_ACTION',
                  data: {
                    rideEstimate: estimate,
                    draftOrder: draft,
                  },
                },
              };
            }
          } catch (multiErr) {
            console.warn('[Fallback] Multi-intent food build failed:', multiErr.message);
          }

          // Fallback if food search failed but ride succeeded
          const rideReply = isEnglish
            ? `Cab from ${pickName} to ${dropName} is ${cabFare} rupees. Confirm the ride?`
            : `${pickName} se ${dropName} cab ${cabFare} rupaye hai. Confirm kar doon?`;
          return {
            reply: rideReply,
            toolCallsMade: ['estimate_ride'],
            screenAction: { type: 'SHOW_RIDE_ESTIMATE', data: estimate },
          };
        }

        return {
          reply: isEnglish
            ? `Cab from ${pickName} to ${dropName} is ${estimate.distanceKm} km, fare ${cabFare} rupees. Should I book it?`
            : `${pickName} se ${dropName} tak ${estimate.distanceKm} km, cab ${cabFare} rupaye. Confirm kar doon?`,
          toolCallsMade: ['estimate_ride'],
          screenAction: { type: 'SHOW_RIDE_ESTIMATE', data: estimate },
        };
      } catch (err) {
        console.warn('[Fallback] estimate_ride failed:', err.message);
      }
    }

    return {
      reply: isEnglish
        ? 'Where would you like to go? For example, Cyber Hub to Rajiv Chowk.'
        : 'Aapko kahan jaana hai? Jaise Cyber Hub se Rajiv Chowk.',
      toolCallsMade: [],
      screenAction: { type: 'CLEAR_FOOD' },
    };
  }

  // ── 2. Check for Food Intent in Fallback ──
  const foodMatch = clean.match(
    /\b(pizza|biryani|briyani|biriyani|burger|chinese|thali|roll|dosa|momos?|mithai|coffee|chai|tea|paneer|chicken|veg|beverages?|shakes?)\b/
  );
  const wantsOrder = /\b(order|pack|kar do|karo|chahiye|kitna pay|total)\b/.test(clean);
  const wantsSearch = /\b(dikhao|dikha do|search|find|show|restaurant|restaurants|what is|menu)\b/.test(clean) || wantsOrder;

  if (foodMatch || wantsSearch) {
    let query =
      foodMatch?.[0] ??
      (clean.replace(/\b(dikhao|dikha do|karo|search|find|show|please|chahiye|lao|me|order|pack)\b/g, '').trim() || 'food');
    if (query === 'briyani' || query === 'biriyani') query = 'biryani';

    const result = await toolMap.search_restaurants({ query, sessionId });
    const items = result.items ?? [];
    if (items.length > 0) {
      if (wantsOrder) {
        try {
          const targetRest = items[0];
          const itemsToAdd = [];

          function parseQty(keywordPattern) {
            const m = clean.match(new RegExp(`(\\d+|do|teen|char|paanch|ek|two|three|four|one)\\s+(?:${keywordPattern})`, 'i'));
            if (!m) return 1;
            const w = m[1].toLowerCase();
            return ({ do: 2, two: 2, teen: 3, three: 3, char: 4, four: 4, paanch: 5, five: 5, ek: 1, one: 1 }[w] ?? parseInt(w, 10)) || 1;
          }

          if (/biryani|briyani|biriyani/i.test(clean)) {
            itemsToAdd.push({ name: 'Veg Dum Biryani', quantity: parseQty('biryani|briyani|biriyani') });
          }
          if (/coffee/i.test(clean)) {
            itemsToAdd.push({ name: 'Cold Coffee', quantity: parseQty('coffee') });
          }
          if (/\b(chai|tea)\b/i.test(clean)) {
            itemsToAdd.push({ name: 'Masala Chai', quantity: parseQty('chai|tea') });
          }
          if (/pizza/i.test(clean)) {
            itemsToAdd.push({ name: 'Margherita Pizza', quantity: parseQty('pizza') });
          }
          if (/burger/i.test(clean)) {
            itemsToAdd.push({ name: 'Veg Burger', quantity: parseQty('burger') });
          }
          if (itemsToAdd.length === 0 && foodMatch) {
            itemsToAdd.push({ name: foodMatch[0], quantity: 1 });
          }

          if (itemsToAdd.length > 0) {
            const draft = await toolMap.build_draft({
              restaurantId: targetRest._id || targetRest.id,
              items: itemsToAdd,
              sessionId,
            });
            const itemSummary = itemsToAdd.map((i) => `${i.quantity} ${i.name}`).join(' aur ');
            return {
              reply: isEnglish
                ? `Added ${itemSummary} from ${targetRest.name}. Total is ${draft.totalAmount} rupees. Should I confirm your order?`
                : `${targetRest.name} se ${itemSummary} add kar di hai. Total ${draft.totalAmount} rupaye hai. Confirm kar doon?`,
              toolCallsMade: ['search_restaurants', 'build_draft'],
              screenAction: { type: 'SHOW_DRAFT', data: draft },
            };
          }
        } catch (draftErr) {
          console.warn('[Fallback] build_draft failed, showing restaurant list instead:', draftErr.message);
        }
      }

      const names = items.slice(0, 3).map((r) => r.name).join(', ');
      return {
        reply: isEnglish
          ? `I found these restaurants for you: ${names}. Which one would you like to order from?`
          : `Maine aapke liye ${names} dhoondh liya hai. Main yahan se aapka order add kar doon?`,
        toolCallsMade: ['search_restaurants'],
        screenAction: { type: 'SHOW_RESTAURANTS', data: items },
      };
    }
    return {
      reply: isEnglish
        ? `No restaurants found for "${query}". You can try searching for biryani or pizza.`
        : `${query} ke liye koi restaurant nahi mila. Aap biryani ya pizza try kar sakte hain.`,
      toolCallsMade: ['search_restaurants'],
      screenAction: null,
    };
  }

  return {
    reply: isEnglish
      ? 'Hello! Would you like to order food or book a ride today?'
      : 'Haanji boliye, aapko khana order karna hai ya cab book karni hai?',
    toolCallsMade: [],
    screenAction: null,
  };
}

// Helper: format Gemini error for readable console logging without massive URLs or chopping off error codes
function formatGeminiError(err) {
  const msg = String(err?.message || err || '');
  return msg
    .replace(/https:\/\/generativelanguage\.googleapis\.com[^\s:]*/g, 'GeminiAPI')
    .replace(/\s+/g, ' ')
    .trim();
}

// Brain model priority list — fast, ultra-low latency models with verified function-calling support
const BRAIN_MODELS = [
  config.geminiModel || 'gemini-3.8-flash',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite-preview',
];

const isBrainRetryable = (err) =>
  /429|quota|rate|503|500|502|504|timeout|fetch failed|network|ENOTFOUND|ECONN|overloaded|unavailable|Role.*not supported/i.test(
    String(err?.message ?? '')
  );

// Tier 1: Gemini tool-calling loop 
export async function runBrain({ conversation, sessionId }) {
  const lastUserMessage = conversation[conversation.length - 1];
  const userText = lastUserMessage.parts[0].text;
  
  // Circuit breaker check
  const now = Date.now();
  const ai = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;
  if (!ai || now < geminiCooldownUntil) {
    return runDeterministicFallback({ text: userText, sessionId });
  }

  let draftResult = null;
  const toolCallsMade = [];

  const modelsToTry = [...new Set(BRAIN_MODELS)];
  let lastErr = null;

  for (const brainModel of modelsToTry) {
    draftResult = null;
    toolCallsMade.length = 0;
    let rideEstimateResult = null;
    let rideBookedResult = null;
    let draftOrderResult = null;
    let restaurantsResult = null;

    try {
      const model = ai.getGenerativeModel({
        model: brainModel,
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      });

      const history = cleanHistory(conversation.slice(0, -1));
      const chat = model.startChat({ history });

      let response = await withTimeout(chat.sendMessage(userText));

      for (let step = 0; step < MAX_STEPS; step++) {
        const parts = response.response.candidates?.[0]?.content?.parts ?? [];
        const functionCalls = parts.filter((p) => p.functionCall);
        if (functionCalls.length === 0) break;

        const functionResponses = [];

        for (const part of functionCalls) {
          const { name, args } = part.functionCall;
          toolCallsMade.push(name);

          if (!toolMap[name]) {
            functionResponses.push({
              functionResponse: {
                name,
                response: { error: `Tool "${name}" is not registered` },
              },
            });
            continue;
          }

          // Server ALWAYS overrides sessionId
          const enrichedArgs = { ...args, sessionId };
          let result;
          try {
            result = await toolMap[name](enrichedArgs);
          } catch (err) {
            result = { error: err.message };
          }

          const safeResult = Array.isArray(result) ? { items: result } : result;

          // Track results for Screen Actions
          if (name === 'search_restaurants' && !result.error) {
            restaurantsResult = safeResult.items ?? [];
          }
          if (name === 'build_draft' && !result.error) {
            draftResult = result;
            draftOrderResult = result;
          }
          if (name === 'estimate_ride' && !result.error) {
            rideEstimateResult = safeResult;
          }
          if (name === 'book_ride' && !result.error) {
            rideBookedResult = safeResult;
          }

          functionResponses.push({
            functionResponse: { name, response: safeResult },
          });
        }

        response = await withTimeout(chat.sendMessage(functionResponses));
      }

      const textPart = response.response.candidates?.[0]?.content?.parts?.find((p) => p.text);
      let reply = textPart?.text ?? 'Aapki request process ho gayi hai.';
      console.log(`[brain] ✅ ${brainModel} replied`);

      const isEnglish = detectUserLanguage(userText) === 'english';
      const extractedDishes = extractFoodItems(userText);
      const isExplicitDishOrder = extractedDishes.length > 0 || /\b(order|mangwa|chahiye|pack|le aao|lao|bring)\b/i.test(userText);

      // Food Draft Safety Net: If user requested specific dishes to order, but Gemini only searched restaurants without calling build_draft
      if (restaurantsResult && !draftOrderResult && isExplicitDishOrder) {
        try {
          const rest = restaurantsResult[0];
          if (rest) {
            const itemsToAdd = extractedDishes.length > 0 ? extractedDishes : [
              { name: 'Cold Coffee', quantity: 1 }
            ];
            draftOrderResult = await toolMap.build_draft({
              restaurantId: rest._id || rest.id,
              items: itemsToAdd,
              sessionId,
            });
            toolCallsMade.push('auto_build_draft');
            const itemSummary = itemsToAdd.map((i) => `${i.quantity} ${i.name}`).join(isEnglish ? ', ' : ' aur ');
            reply = isEnglish
              ? `I have drafted ${itemSummary} from ${rest.name}. Total is ${draftOrderResult.totalAmount} rupees. Confirm order?`
              : `${rest.name} se ${itemSummary} draft ho gaya. Total ${draftOrderResult.totalAmount} rupaye. Confirm kar doon?`;
          }
        } catch (e) {
          console.warn('[brain] Auto-build draft food fallback error:', e.message);
        }
      }

      // Multi-intent safety: if user asked for both ride and food but Gemini only estimated ride
      const hasFoodRequest = /\b(coffee|pizza|biryani|chai|tea|burger|food|khana|dish)\b/i.test(userText);
      if (rideEstimateResult && !draftOrderResult && hasFoodRequest) {
        try {
          const foodQuery = /coffee/i.test(userText) ? 'coffee' : /chai|tea/i.test(userText) ? 'chai' : /dosa/i.test(userText) ? 'dosa' : /pizza/i.test(userText) ? 'pizza' : /biryani/i.test(userText) ? 'biryani' : 'food';
          const restResult = await toolMap.search_restaurants({ query: foodQuery, sessionId });
          const rest = (restResult.items ?? [])[0];
          if (rest) {
            const itemsToAdd = extractedDishes.length > 0 ? extractedDishes : [
              { name: 'Cold Coffee', quantity: 1 }
            ];

            draftOrderResult = await toolMap.build_draft({
              restaurantId: rest._id || rest.id,
              items: itemsToAdd,
              sessionId,
            });
            toolCallsMade.push('auto_build_draft');

            const cabFare = (rideEstimateResult.fares || []).find((f) => f.type === 'cab_economy')?.fare || 150;
            const pickName = shortPlace(rideEstimateResult.pickup?.address, '');
            const dropName = shortPlace(rideEstimateResult.drop?.address, '');
            const itemSummary = itemsToAdd.map((i) => `${i.quantity} ${i.name}`).join(isEnglish ? ', ' : ' aur ');

            reply = isEnglish
              ? `Cab from ${pickName} to ${dropName} is ${cabFare} rupees, and ${itemSummary} for ${draftOrderResult.totalAmount} rupees. Confirm both?`
              : `${pickName} se ${dropName} cab ${cabFare} rupaye, aur ${itemSummary} ${draftOrderResult.totalAmount} rupaye. Dono confirm kar doon?`;
          }
        } catch (e) {
          console.warn('[brain] Auto-build draft fallback error:', e.message);
        }
      }

      // Determine combined screenAction for frontend UI
      let screenAction = null;
      if ((rideEstimateResult || rideBookedResult) && (draftOrderResult || restaurantsResult)) {
        screenAction = {
          type: 'MULTI_ACTION',
          data: {
            rideEstimate: rideEstimateResult,
            bookedRide: rideBookedResult,
            draftOrder: draftOrderResult,
            restaurants: restaurantsResult,
          },
        };
      } else if (rideBookedResult) {
        screenAction = { type: 'RIDE_BOOKED', data: rideBookedResult };
      } else if (rideEstimateResult) {
        screenAction = { type: 'SHOW_RIDE_ESTIMATE', data: rideEstimateResult };
      } else if (draftOrderResult) {
        screenAction = { type: 'SHOW_DRAFT', data: draftOrderResult };
      } else if (restaurantsResult) {
        screenAction = { type: 'SHOW_RESTAURANTS', data: restaurantsResult };
      }

      return { reply, toolCallsMade, screenAction };

    } catch (err) {
      if (draftResult) {
        return {
          reply: `Aapka order draft taiyar hai. Total ${draftResult.totalAmount} rupaye. Confirm karne ke liye haan bolein.`,
          toolCallsMade,
          screenAction: { type: 'SHOW_DRAFT', data: draftResult },
        };
      }
      if (isBrainRetryable(err)) {
        console.warn(`[brain] ${brainModel} failed (retryable), trying next:`, formatGeminiError(err));
        lastErr = err;
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      throw err;
    }
  }

  // All models failed -> cooldown & fallback
  if (lastErr) {
    console.warn(`[Aura Brain] All models failed, cooling down ${COOLDOWN_MS / 1000}s:`, formatGeminiError(lastErr));
    geminiCooldownUntil = Date.now() + COOLDOWN_MS;
  }
  return runDeterministicFallback({ text: userText, sessionId });
}

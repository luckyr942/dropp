
// Handles the Gemini tool-calling loop (capped to 5 steps, with strict server-enforced sessionId).

import { GoogleGenerativeAI } from "@google/generative-ai";
import { toolMap, TOOL_DECLARATIONS } from "./toolRegistry.js";
import { config } from "../config/config.js";

// NOTE: genAI is intentionally NOT created at module load time.
// config reads .env with override:true so it must be read after dotenv runs.
// We create a fresh GoogleGenerativeAI instance per-request in runBrain().

const SYSTEM_PROMPT = `You are Aura, the ultra-fast friendly voice assistant for the Dropp super-app (Food Delivery & Ride Hailing).
Your voice output will be read aloud to the user through text-to-speech.

CRITICAL VOICE RULES:
1. Speak in warm, natural everyday conversational Hinglish (like a friendly Indian assistant, e.g. "Haanji! Cyber Hub se Rajiv Chowk tak cab 478 rupaye hai. Book kar doon?").
2. NEVER use markdown symbols like **, *, _, #, bullets, or dashes. Plain conversational text only.
3. NEVER use currency symbols like ₹. Always say "rupaye" (e.g. "250 rupaye").
4. NEVER use emojis in replies because the text-to-speech engine reads them aloud awkwardly.
5. Keep replies strictly under 8 to 12 words. Be ultra-punchy, brief, and direct (e.g. "Biryani add ho gayi, 279 rupaye. Confirm karein?"). Every single extra word burns Sarvam credits and adds latency. Never use conversational filler like "Main aapki sahayata kar sakta hoon".
6. Only use real data from tools. Never invent restaurants, prices, fares, or distances.

FOOD ORDERING RULES:
7. If the user asks for food, search restaurants and call build_draft. State the items and total in rupaye, and ask for confirmation. Never confirm on the user's behalf.

RIDE HAILING RULES:
8. When the user asks for a ride, cab, auto, or bike (e.g. "Cab chahiye Cyber Hub se Rajiv Chowk" or "Airport kitna lagega"), call "estimate_ride".
9. In your reply, state the distance in kilometre, the fare in rupaye, and ask for confirmation to book.
10. When the user confirms (e.g. "Haan cab book kardo"), call "book_ride" with the quoteId and rideType.
11. Once booked, announce the driver name, vehicle, and 4-digit OTP clearly (e.g. "Aapki cab book ho gayi! Driver Vikram aa rahe hain. OTP hai 4421.").

ORDER STATUS RULES:
12. When the user asks where their order is or asks for status (e.g. "Mera order kahan hai?", "Order kab aayega?", "Where is my order?"), immediately call "get_order_status". State the spokenStatus returned by the tool.`;

const MAX_STEPS = 3;
const MODEL_TIMEOUT_MS = 15000;
const COOLDOWN_MS = 30_000;

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

// Rejects history that does not start with a user turn
function cleanHistory(history) {
  const h = [...history];
  while (h.length && h[0].role !== 'user') h.shift();
  return h;
}

// Tier 2: Deterministic fallback for when Gemini is offline or rate-limited
async function runDeterministicFallback({ text, sessionId }) {
  const clean = String(text ?? '').toLowerCase().trim();
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
  const isRideRequest = /\b(cab|ride|auto|taxi|bike|gaadi|jana hai|jaana hai|dropp go)\b/i.test(clean);
  if (isRideRequest) {
    // Check if user specified "se" and "tak" or "to"
    const match = clean.match(/(?:from\s+|)(.+?)\s+(?:se|to)\s+(.+?)(?:\s+tak|\s+cab|\s+chahiye|\s+book|$)/i);
    if (match && match[1] && match[2]) {
      const pickup = match[1].replace(/\b(cab|ride|auto|book|chahiye|mujhe)\b/g, '').trim();
      const drop = match[2].replace(/\b(cab|ride|auto|book|chahiye|tak|jaana hai)\b/g, '').trim();

      if (pickup && drop) {
        try {
          const estimate = await toolMap.estimate_ride({ pickup, drop, sessionId });
          const cabFare = estimate.fares.find((f) => f.type === 'cab_economy')?.fare || 150;
          return {
            reply: isEnglish
              ? `Ride from ${estimate.pickup.address} to ${estimate.drop.address} is ${estimate.distanceKm} km. Cab fare is ${cabFare} rupees. Should I book it?`
              : `${estimate.pickup.address} se ${estimate.drop.address} tak cab ka kiraaya ${cabFare} rupaye hai. Confirm kar doon?`,
            toolCallsMade: ['estimate_ride'],
            screenAction: { type: 'SHOW_RIDE_ESTIMATE', data: estimate },
          };
        } catch (_) {}
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
      // If the customer specifically requested to ORDER or ADD items:
      if (wantsOrder) {
        try {
          const targetRest = items[0];
          const itemsToAdd = [];

          if (/biryani|briyani|biriyani/i.test(clean)) {
            const qtyMatch = clean.match(/\b(do|two|2)\b/i);
            itemsToAdd.push({ name: 'Veg Dum Biryani', quantity: qtyMatch ? 2 : 1 });
          }
          if (/coffee/i.test(clean)) {
            itemsToAdd.push({ name: 'Cold Coffee', quantity: 1 });
          }
          if (/pizza/i.test(clean)) {
            itemsToAdd.push({ name: 'Margherita Pizza', quantity: 1 });
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

// Brain model priority list (using verified production Gemini models)
const BRAIN_MODELS = [
  config.geminiModel || 'gemini-1.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash-exp',
];

const isBrainRetryable = (err) =>
  /429|quota|rate|503|500|502|504|timeout|fetch failed|network|ENOTFOUND|ECONN|overloaded|unavailable|Role.*not supported/i.test(
    String(err?.message ?? '')
  );

// ── Tier 1: Gemini tool-calling loop 
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
  let screenAction = null;

  const modelsToTry = [...new Set(BRAIN_MODELS)];
  let lastErr = null;

  for (const brainModel of modelsToTry) {
    draftResult = null;
    toolCallsMade.length = 0;
    screenAction = null;

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

          // ── Update Screen Actions for Frontend UI ──
          if (name === 'search_restaurants' && !result.error && !draftResult) {
            screenAction = { type: 'SHOW_RESTAURANTS', data: safeResult.items ?? [] };
          }
          if (name === 'build_draft' && !result.error) {
            draftResult = result;
            screenAction = { type: 'SHOW_DRAFT', data: result };
          }
          if (name === 'estimate_ride' && !result.error) {
            screenAction = { type: 'SHOW_RIDE_ESTIMATE', data: safeResult };
          }
          if (name === 'book_ride' && !result.error) {
            screenAction = { type: 'RIDE_BOOKED', data: safeResult };
          }

          functionResponses.push({
            functionResponse: { name, response: safeResult },
          });
        }

        response = await withTimeout(chat.sendMessage(functionResponses));
      }

      const textPart = response.response.candidates?.[0]?.content?.parts?.find((p) => p.text);
      const reply = textPart?.text ?? 'Aapki request process ho gayi hai.';
      console.log(`[brain] ✅ ${brainModel} replied`);
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
        console.warn(`[brain] ${brainModel} failed (retryable), trying next:`, err.message.slice(0, 80));
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  // All models failed -> cooldown & fallback
  if (lastErr) {
    console.warn('[Aura Brain] All models failed, cooling down 60s:', lastErr.message.slice(0, 80));
    geminiCooldownUntil = Date.now() + COOLDOWN_MS;
  }
  return runDeterministicFallback({ text: userText, sessionId });
}

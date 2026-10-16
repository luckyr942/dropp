// Handles the Gemini tool-calling loop (capped to 5 steps, with strict server-enforced sessionId).

import { GoogleGenerativeAI } from "@google/generative-ai";
import { toolMap, TOOL_DECLARATIONS } from "./toolRegistry.js";
import { config } from "../config/config.js";

const genAI = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;

const SYSTEM_PROMPT = `You are Aura, the voice assistant for Dropp, a super-app for food delivery and rides.
Help users find restaurants, browse menus, and prepare order drafts using only the tools provided.
Always reply in the user's language (English, Hindi, or Hinglish). Keep replies to one or two short sentences: this is a voice interface.
Never invent restaurant names, menu items, prices, or order IDs. Only use data returned by tools.
If an item is ambiguous or unavailable, ask a short question instead of guessing.
When a draft is ready, state the items and the total, then ask the user to confirm. Never confirm on the user's behalf.
If a tool returns an error, tell the user politely and ask what they want to do.
If the user asks about something unrelated to ordering, politely say you can only help with Dropp orders.`;

const MAX_STEPS = 5;
const MODEL_TIMEOUT_MS = 8000;
const COOLDOWN_MS = 60_000;

//CIRCUIT breaker after a provider failure , skip Gemini for while
let geminiCooldownUntil = 0;


const withTimeout = (promise, ms = MODEL_TIMEOUT_MS) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);



// Only provider/network problems should trigger the fallback.
// A bug in our own code should surface, not be hidden.
const isProviderError = (err) =>
  /429|quota|rate|503|500|502|504|timeout|fetch failed|network|ENOTFOUND|ECONN|overloaded|unavailable|not found/i.test(
    String(err?.message ?? '')
  );


//rejects history that does not start with a user turn 
function cleanHistory(history){
    const h = [...history];
    while(h.length && h[0].role !== 'user')h.shift();
    return h;
}


//teir 2: deterministic fallback for the search only --> It’s a basic search safety net, not a full offline Aura.
async function runDeterministicFallback({ text, sessionId }) {
  const clean = String(text ?? '').toLowerCase().trim();
  const foodMatch = clean.match(
    /\b(pizza|biryani|burger|chinese|thali|roll|dosa|momos?|mithai|coffee|paneer|chicken|veg)\b/
  );
  const wantsSearch = /\b(dikhao|dikha do|search|find|restaurant|restaurants)\b/.test(clean);
  if (foodMatch || wantsSearch) {
    const query =
      foodMatch?.[0] ??
      (clean.replace(/\b(dikhao|dikha do|karo|search|find|please)\b/g, '').trim() || 'food');
    const result = await toolMap.search_restaurants({ query, sessionId });
    const items = result.items ?? [];
    if (items.length > 0) {
      const names = items.slice(0, 3).map((r) => r.name).join(', ');
      return {
        reply: `Ye restaurants mile: ${names}. Kiska menu dekhna hai?`,
        toolCallsMade: ['search_restaurants'],
        screenAction: { type: 'SHOW_RESTAURANTS', data: items },
      };
    }
    return {
      reply: `"${query}" ke liye koi restaurant nahi mila. Kuch aur try karein?`,
      toolCallsMade: ['search_restaurants'],
      screenAction: null,
    };
  }
  return {
    reply: 'Hey! 😊 Kya khane ka mood hai? Biryani, pizza, burger ya kuch aur? Batao, main nearby options dhoondh deti hoon.',
    toolCallsMade: [],
    screenAction: null,
  };
}
  
// ── Tier 1: Gemini tool-calling loop 
export async function runBrain({ conversation, sessionId }) {
  const lastUserMessage = conversation[conversation.length - 1];
  const userText = lastUserMessage.parts[0].text;
  // Circuit breaker check
  const now = Date.now();
  if (!genAI || now < geminiCooldownUntil) {
    return runDeterministicFallback({ text: userText, sessionId });
  }
  let draftResult = null;
  const toolCallsMade = [];
  let screenAction = null;
  try {
    const model = genAI.getGenerativeModel({
      model: config.geminiModel || 'gemini-2.0-flash',
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
        if (name === 'build_draft' && !result.error) {
          draftResult = result;
          screenAction = { type: 'SHOW_DRAFT', data: result };
        }
        functionResponses.push({
          functionResponse: { name, response: safeResult },
        });
      }
      response = await withTimeout(chat.sendMessage(functionResponses));
    }
    const textPart = response.response.candidates?.[0]?.content?.parts?.find((p) => p.text);
    const reply = textPart?.text ?? 'Aapki request process ho gayi hai.';
    return { reply, toolCallsMade, screenAction };
  } catch (err) {
    // If a draft was successfully created before the error, do NOT lose it!
    if (draftResult) {
      return {
        reply: `Aapka order draft taiyar hai. Total ₹${draftResult.totalAmount}. Confirm karne ke liye 'haan' bolein.`,
        toolCallsMade,
        screenAction: { type: 'SHOW_DRAFT', data: draftResult },
      };
    }
    if (isProviderError(err)) {
      console.warn('[Aura Brain] Provider failure, cooling down for 60s:', err.message);
      geminiCooldownUntil = Date.now() + COOLDOWN_MS;
      return runDeterministicFallback({ text: userText, sessionId });
    }
    // Don't swallow real programming bugs
    throw err;
  }
}


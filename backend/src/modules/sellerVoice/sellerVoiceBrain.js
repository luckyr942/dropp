// Built-in seller voice pipeline: speech → text (Sarvam / Gemini STT) → Gemini with seller tools →
// reply → speech (Sarvam TTS). Runs entirely on our backend, so it works without a public URL.
// Uses the same tools as the Bolna agent (sellerVoiceTools.js), so both paths behave the same.
import { config } from '../../config/config.js';
import { transcribeAudio } from '../../aura/sttService.js';
import { textToSpeech, storeAudio } from '../../aura/ttsService.js';
import { TOOL_SPECS } from './bolnaSellerAgent.js';
import { runSellerVoiceTool } from './sellerVoiceTools.js';

// Configured model first, then current fallbacks (older 2.x models are closed to new keys)
const MODELS = [...new Set([config.geminiModel || 'gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite-preview'])];
const MAX_TOOL_STEPS = 4;
// Models that just returned "busy" (503/429) are skipped for a while instead of costing seconds per turn
const BUSY_COOLDOWN_MS = 2 * 60 * 1000;
const busyUntil = new Map();
const MODEL_TIMEOUT_MS = 12000;

const FUNCTION_DECLARATIONS = TOOL_SPECS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: Object.keys(t.properties).length
        ? { type: 'object', properties: t.properties, required: t.required }
        : { type: 'object', properties: {} },
}));

function systemPrompt(storeName, sellerName) {
    return `You are Aura, the voice assistant inside the Dropp Seller app, helping ${sellerName || 'the seller'} run their store "${storeName}" in India.
Your reply is spoken aloud. Reply in the same language the seller just used: if their message is in English, reply only in Indian English; if Hindi or Hinglish, reply in natural Hinglish (Roman script). Keep it under 20 words.
Say prices as "rupaye" in Hinglish or "rupees" in English. No symbols, markdown, emojis or lists.

Use tools for anything about the store: today's summary, finding products and stock, adding products, changing stock or price, availability, orders, and opening or closing the store.
Rules:
1. "20 kar do" means set quantity 20. "5 aur aaye" means change +5. "3 bik gaye" means change -3.
2. For add_product you need name, price and stock. If something is missing, ask for it in one short question instead of calling the tool.
3. If a tool reports several matching products, read the options and ask which one.
4. Before rejecting an order or closing the store, ask the seller to confirm, unless they already clearly said so.
5. After a tool runs, tell the seller the result in one short sentence. Never invent stock, prices or orders.`;
}

// history: [{ role: 'user' | 'assistant', text }] from the app, newest last
function toGeminiHistory(history = []) {
    return history
        .filter((h) => h && typeof h.text === 'string' && h.text.trim())
        .slice(-8)
        .map((h) => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.text.slice(0, 500) }] }));
}

// Gemini requires the history to start with a user turn
const trimLeadingModel = (turns) => {
    const i = turns.findIndex((t) => t.role === 'user');
    return i === -1 ? [] : turns.slice(i);
};

// Direct REST call: the installed @google/generative-ai SDK sends tool results with role "function",
// which current Gemini models reject, and it drops the thought signatures they require on follow-ups.
async function generate(modelName, body) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.geminiApiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw Object.assign(new Error(json.error?.message || `Gemini HTTP ${res.status}`), { status: res.status });
        return json.candidates?.[0]?.content || { role: 'model', parts: [] };
    } catch (err) {
        if (err.name === 'AbortError') throw Object.assign(new Error('Model timed out'), { status: 504 });
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

const MUTATING = /^(add_product|update_stock|set_price|set_availability|update_order|set_store_open)$/;

async function think({ merchant, sellerName, text, history }) {
    if (!config.geminiApiKey) throw new Error('GEMINI_API_KEY is not set');
    const actions = [];
    let lastError;

    const now = Date.now();
    const ordered = [...MODELS.filter((m) => (busyUntil.get(m) || 0) <= now), ...MODELS.filter((m) => (busyUntil.get(m) || 0) > now)];
    // Two passes: Gemini "high demand" 503s are usually gone within a second or two
    const attempts = [...ordered, null, ...ordered];
    const deadline = now + 25000;
    for (const modelName of attempts) {
        if (Date.now() > deadline) break;
        if (modelName === null) {
            await new Promise((r) => setTimeout(r, 1200));
            continue;
        }
        const contents = [...trimLeadingModel(toGeminiHistory(history)), { role: 'user', parts: [{ text }] }];
        const base = {
            systemInstruction: { parts: [{ text: systemPrompt(merchant.name, sellerName) }] },
            tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
        };
        try {
            let content = await generate(modelName, { ...base, contents });
            for (let step = 0; step < MAX_TOOL_STEPS; step++) {
                const calls = (content.parts || []).filter((p) => p.functionCall);
                if (calls.length === 0) break;
                contents.push(content); // keep the model turn verbatim (incl. thought signatures)
                const responses = [];
                for (const { functionCall } of calls) {
                    const result = await runSellerVoiceTool(functionCall.name, merchant._id.toString(), functionCall.args || {});
                    if (result.ok && MUTATING.test(functionCall.name)) actions.push(result.message);
                    responses.push({
                        functionResponse: {
                            name: functionCall.name,
                            ...(functionCall.id ? { id: functionCall.id } : {}),
                            response: { ok: result.ok, message: result.message },
                        },
                    });
                }
                contents.push({ role: 'user', parts: responses });
                content = await generate(modelName, { ...base, contents });
            }
            const reply = (content.parts || [])
                .filter((p) => p.text && !p.thought)
                .map((p) => p.text)
                .join(' ')
                .replace(/[*_#`]/g, '')
                .trim();
            return { reply: reply || actions[actions.length - 1] || 'Ho gaya.', actions, model: modelName };
        } catch (err) {
            lastError = err;
            if (err.status === 503 || err.status === 429) busyUntil.set(modelName, Date.now() + BUSY_COOLDOWN_MS);
            console.warn(`[sellerVoice] ${modelName} failed: ${err.message.slice(0, 160)}`);
            // Tool side effects already happened; never replay them on another model
            if (actions.length) return { reply: actions[actions.length - 1], actions, model: modelName };
        }
    }
    throw Object.assign(new Error('Aura is busy right now. Please try again in a moment.'), { status: 503, cause: lastError });
}

// ── Fast path ──────────────────────────────────────────────────────────────
// Common, unambiguous commands are parsed directly so they work instantly even when the AI is slow or
// overloaded. Anything not matched here goes to Gemini. Handles Hinglish and English (the STT may
// translate Hindi speech to English).
const HINDI_NUM = { ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, che: 6, saat: 7, aath: 8, nau: 9, das: 10, bees: 20, pachas: 50, sau: 100 };
const NUM = '(\\d+|' + Object.keys(HINDI_NUM).join('|') + ')';
// Trailing filler the STT often mangles: "kar do", "ka do", "kar dena", "karo", "please", "packet"...
const TAIL = '(?: (?:kar|ka|karo|kardo|kardena|kar|do|de|dena|dijiye|please|pieces?|units?|packets?|pcs|rupaye|rupees|rs|set|hai))*';
const toInt = (w) => (/^\d+$/.test(w) ? Number(w) : HINDI_NUM[w.toLowerCase()]);
const clean = (p) =>
    p
        .replace(/\b(the|of|ka|ki|ke|wala|wali|mera|meri|please|plz|aura|stock|price|rate|daam|mein|me)\b/gi, ' ')
        .replace(/[^\w\s.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

export function parseFastCommand(raw) {
    const t = ` ${String(raw || '').toLowerCase().replace(/[?!.,]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
    let m;
    // summary / sales / orders today
    if (/\b(aaj|today|abhi tak)\b.*\b(sale|sales|kamai|revenue|business|orders?)\b|\b(store summary|kaisa chal raha)\b/.test(t)) {
        return { tool: 'store_summary', args: {} };
    }
    // low stock
    if (/\b(khatam ho rah|low stock|running low|kam ho rah|kya khatam|kya kya khatam)/.test(t)) {
        return { tool: 'find_products', args: { only_low_stock: 'true' } };
    }
    // orders: "latest order accept kar do", "order ready kar do", "naye orders dikhao"
    if ((m = t.match(/\b(?:latest|naya|new|pichla|last) order (accept|ready|reject|prepar\w*)/)) || (m = t.match(/\border (accept|ready|reject) (?:kar do|kardo|karo)/))) {
        const action = m[1].startsWith('prepar') ? 'preparing' : m[1];
        return { tool: 'update_order', args: { order_ref: 'latest', action } };
    }
    if (/\b(naye orders|new orders|orders dikhao|show orders|pending orders|kitne orders pending)\b/.test(t)) {
        return { tool: 'list_orders', args: { status: 'ongoing' } };
    }
    // "<product> ka price/rate 32 (rupaye) kar do" | "set <product> price to 32"
    if ((m = t.match(new RegExp(`^ (?:set |change |make )?(.+?) (?:ka |ki |ke )?(?:price|rate|daam|mrp)(?: to| ko)? ${NUM}${TAIL} $`)))
        || (m = t.match(new RegExp(`^ (?:set|change|make) (?:the )?(?:price|rate) of (.+?) to ${NUM}(?: rupees| rs)? $`)))) {
        const product = clean(m[1]);
        const price = toInt(m[2]);
        if (product && price !== undefined) return { tool: 'set_price', args: { product, price } };
    }
    // "<N> <product> bik gaye / sold"
    if ((m = t.match(new RegExp(`^ ${NUM} (.+?) (?:bik gaye|bik gaya|bike|sold|bech diye|bik gay)${TAIL} $`)))) {
        const product = clean(m[2]);
        if (product) return { tool: 'update_stock', args: { product, change: -toInt(m[1]) } };
    }
    // "<N> <product> aur aaye / aa gaye / add stock"
    if ((m = t.match(new RegExp(`^ ${NUM} (?:aur )?(.+?) (?:aur aaye|aaye|aa gaye|aa gaya|aur aa gaye|received|came in)${TAIL} $`)))) {
        const product = clean(m[2]);
        if (product) return { tool: 'update_stock', args: { product, change: toInt(m[1]) } };
    }
    // "<product> ka stock 20 kar do" | "set <product> stock to 20" | "make maggi stock 20"
    if ((m = t.match(new RegExp(`^ (?:set |make |update )?(?:the )?(.+?) (?:ka |ki )?stock(?: to| ko)? ${NUM}${TAIL} $`)))
        || (m = t.match(new RegExp(`^ (?:set|make|update) (?:the )?stock (?:of|for) (.+?) to ${NUM} $`)))) {
        const product = clean(m[1]);
        const quantity = toInt(m[2]);
        if (product && quantity !== undefined) return { tool: 'update_stock', args: { product, quantity } };
    }
    // "<product> khatam ho gaya / out of stock"
    if ((m = t.match(/^ (?:mark )?(.+?) (?:khatam ho gaya|khatam ho gayi|khatam|out of stock|nahi hai|stock out) $/))) {
        const product = clean(m[1]);
        if (product) return { tool: 'set_availability', args: { product, available: 'false' } };
    }
    // "<product> kitna bacha hai" | "how much <product> is left"
    if ((m = t.match(/^ (.+?) (?:kitna|kitne|kitni) (?:bacha|bache|bachi|hai|hain|stock)/)) || (m = t.match(/^ how (?:much|many) (.+?) (?:is |are )?(?:left|in stock|remaining) $/))) {
        const product = clean(m[1]);
        if (product) return { tool: 'find_products', args: { query: product } };
    }
    return null;
}

const looksHindi = (text) => /\b(ka|ki|ke|kar|do|hai|hain|aaj|kitna|kitne|bacha|khatam|aur|bik|gaye|rupaye)\b|[ऀ-ॿ]/i.test(text);

// Turn a tool result into a short spoken reply in the seller's language
function speakResult(tool, result, hindi) {
    if (!hindi || !result.ok) return result.message;
    const d = result.data || {};
    switch (tool) {
        case 'update_stock': return `${d.name} ka stock ab ${d.stock} hai.`;
        case 'set_price': return `${d.name} ka price ab ${d.price} rupaye hai.`;
        case 'set_availability': return d.availability === 'out_of_stock' ? `${d.name} ko out of stock mark kar diya.` : `${d.name} ab available hai.`;
        case 'store_summary': return `Aaj ${d.ordersToday} orders aaye, ${d.revenueToday} rupaye ki sale hui, aur ${d.activeOrders} orders active hain.`;
        case 'find_products': {
            const items = Array.isArray(d) ? d : [];
            if (items.length === 0) return 'Koi bhi item kam nahi hai, sab theek hai.';
            return items.slice(0, 4).map((p) => `${p.name} ke ${p.stock} bache hain`).join(', ') + '.';
        }
        default: return result.message;
    }
}

export async function runSellerVoiceTurn({ merchant, sellerName, audioBase64, text, history }) {
    let transcript = typeof text === 'string' ? text.trim() : '';
    if (!transcript && audioBase64) transcript = (await transcribeAudio(audioBase64))?.trim() || '';
    if (!transcript) {
        return { transcript: '', reply: "Sorry, I didn't catch that. Please say it again.", actions: [], audioUrl: null };
    }

    let reply;
    let actions = [];
    const fastCmd = parseFastCommand(transcript);
    if (fastCmd) {
        const result = await runSellerVoiceTool(fastCmd.tool, merchant._id.toString(), fastCmd.args);
        // A product we couldn't find might be phrased oddly; let the AI have a go before giving up
        if (result.ok || !/could not find/i.test(result.message)) {
            if (result.ok && MUTATING.test(fastCmd.tool)) actions.push(result.message);
            reply = speakResult(fastCmd.tool, result, looksHindi(transcript));
        }
    }
    if (!reply) try {
        ({ reply, actions } = await think({ merchant, sellerName, text: transcript, history }));
    } catch (err) {
        // Model outage: answer (and speak) gracefully instead of failing the request
        reply = /hindi|[\u0900-\u097F]|kar do|karo|hai\b/i.test(transcript)
            ? 'Abhi thoda busy hoon, ek baar phir boliye.'
            : "I'm a little busy right now, please say that again.";
    }

    let audioUrl = null;
    try {
        const buffer = await textToSpeech(reply);
        if (buffer) {
            const id = `sv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            storeAudio(id, buffer);
            audioUrl = `/api/aura/audio/${id}`;
        }
    } catch (err) {
        console.warn('[sellerVoice] TTS skipped:', err.message);
    }
    return { transcript, reply, actions, audioUrl };
}

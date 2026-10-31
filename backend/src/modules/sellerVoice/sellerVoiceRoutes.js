// Seller voice assistant (Bolna AI) routes.
//  POST /api/voice/seller/session      seller app → mint a single-use Bolna web-call session for one store
//  POST /api/voice/seller/tools/:name  Bolna → run a store action (shared secret + per-session token)
//  POST /api/voice/seller/turn         seller app → built-in pipeline: audio/text → STT → Gemini tools → TTS
//  GET  /api/voice/seller/status       seller app → which voice mode is available
import { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { getOwnedMerchant } from '../merchants/merchantService.js';
import { config } from '../../config/config.js';
import { runSellerVoiceTool } from './sellerVoiceTools.js';
import { SELLER_VOICE_TOOL_NAMES } from './bolnaSellerAgent.js';
import { runSellerVoiceTurn } from './sellerVoiceBrain.js';

const router = Router();
const SESSION_AUDIENCE = 'dropp-seller-voice';
const SESSION_TTL = '2h';
const BOLNA_SESSION_URL = 'https://api.bolna.ai/web-call/session';

const voiceReady = () => Boolean(config.bolnaApiKey && config.bolnaSellerAgentId && config.bolnaToolSecret);

// Bolna (live, full-duplex call) when configured; otherwise the built-in push-to-talk pipeline
router.get('/status', (req, res) => {
    res.json({ success: true, data: { enabled: true, mode: voiceReady() ? 'bolna' : 'builtin' } });
});

router.post('/turn', requireAuth, requireRole('merchant'), async (req, res, next) => {
    try {
        const { merchantId, audioBase64, text, history, sellerName } = req.body ?? {};
        if (!audioBase64 && !(typeof text === 'string' && text.trim())) {
            return res.status(400).json({ success: false, error: 'Send audioBase64 or text' });
        }
        if (audioBase64 && audioBase64.length > 8 * 1024 * 1024) {
            return res.status(413).json({ success: false, error: 'Recording is too long' });
        }
        const merchant = await getOwnedMerchant(merchantId, req.user.id);
        const result = await runSellerVoiceTurn({
            merchant,
            sellerName,
            audioBase64,
            text,
            history: Array.isArray(history) ? history : [],
        });
        console.log(`[sellerVoice] turn store=${merchant._id} "${result.transcript}" → "${result.reply}"`);
        return res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

// ── 1. Seller app asks for a call session ───────────────────────────────────
router.post('/session', requireAuth, requireRole('merchant'), async (req, res, next) => {
    try {
        if (!voiceReady()) {
            return res.status(503).json({ success: false, error: 'Voice assistant is not set up on the server yet.' });
        }
        const merchant = await getOwnedMerchant(req.body?.merchantId, req.user.id);
        // The agent passes this back on every tool call; it pins the call to this one store
        const sessionToken = jwt.sign({ mid: merchant._id.toString(), uid: req.user.id }, process.env.JWT_ACCESS_SECRET, {
            audience: SESSION_AUDIENCE,
            expiresIn: SESSION_TTL,
        });
        const language = ['hi', 'en'].includes(req.body?.language) ? req.body.language : undefined;

        const r = await fetch(BOLNA_SESSION_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${config.bolnaApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agent_id: config.bolnaSellerAgentId,
                user_data: {
                    session_token: sessionToken,
                    store_name: merchant.name,
                    seller_name: req.body?.sellerName || 'there',
                },
                ...(language ? { agent_data: { language } } : {}),
            }),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
            console.warn('[sellerVoice] Bolna session mint failed:', r.status, JSON.stringify(body).slice(0, 300));
            return res.status(502).json({
                success: false,
                error: body?.message || body?.detail || body?.error || `Voice service unavailable (${r.status})`,
            });
        }
        return res.json({ success: true, data: { session: body } });
    } catch (err) {
        next(err);
    }
});

// ── 2. Bolna calls a tool ───────────────────────────────────────────────────
function safeEqual(a, b) {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function requireBolnaSecret(req, res, next) {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    if (!config.bolnaToolSecret || !token || !safeEqual(token, config.bolnaToolSecret)) {
        return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }
    next();
}

router.post('/tools/:name', requireBolnaSecret, async (req, res) => {
    const { name } = req.params;
    // Bolna may send params as a JSON body or as query parameters; accept both
    const args = { ...(req.query || {}), ...(req.body && typeof req.body === 'object' ? req.body : {}) };
    try {
        if (!SELLER_VOICE_TOOL_NAMES.includes(name)) {
            return res.json({ ok: false, message: `Unknown action ${name}.` });
        }
        let claims;
        try {
            claims = jwt.verify(String(args.session_token || ''), process.env.JWT_ACCESS_SECRET, { audience: SESSION_AUDIENCE });
        } catch {
            // 200 with a message so the agent can tell the seller instead of failing silently
            return res.json({ ok: false, message: 'This voice session has expired. Please close and reopen the assistant.' });
        }
        delete args.session_token;
        const result = await runSellerVoiceTool(name, claims.mid, args);
        console.log(`[sellerVoice] ${name} store=${claims.mid} → ${result.ok ? 'ok' : 'fail'}: ${result.message}`);
        return res.json(result);
    } catch (err) {
        console.error(`[sellerVoice] ${name} error:`, err.message);
        return res.json({ ok: false, message: 'Something went wrong doing that. Please try again.' });
    }
});

export default router;

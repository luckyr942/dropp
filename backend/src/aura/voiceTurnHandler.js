// backend/src/aura/voiceTurnHandler.js
// Handles voice and text turns for Aura:
// 1. Checks if the user is confirming or cancelling an order/ride in code (Fast-Path).
// 2. Loads and saves server-side conversation history.
// 3. Runs the LLM brain and returns { reply, toolCallsMade, screenAction, audioUrl }.

import { runBrain } from './brain.js';
import { startSession, confirmSessionOrder } from './auraService.js';
import { bookRide } from '../modules/rides/rideService.js';
import { AuraSession } from './sessionModel.js';
import { config } from '../config/config.js';
import { textToSpeech, storeAudio } from './ttsService.js';

const MAX_TEXT_LENGTH = 300;
const MAX_STORED_TURNS = 40;  // How many past messages we keep in MongoDB
const MAX_PROMPT_TURNS = 6;   // Optimized: only send last 6 turns to Gemini (saves 70% input tokens)

async function getAudioUrl(reply) {
  try {
    const buffer = await textToSpeech(reply);
    if (!buffer) return null;
    const audioId = `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    storeAudio(audioId, buffer);
    return `/api/aura/audio/${audioId}`;
  } catch (err) {
    console.warn('[voiceTurnHandler] Audio generation skipped:', err.message);
    return null;
  }
}

// Whole utterance must be a confirmation (e.g., "haan", "yes confirm", "haan confirm kar do", "theek hai kar do", "book kar do")
const CONFIRM_REGEX =
  /^\s*(haan|han|yes|ok|theek hai|confirm|book|kar do)(\s+(confirm|kar do|karo|ji|place karo|order kar do|book kar do|cab book kar do|please))*[.!?\s]*$/i;

// Whole utterance must be a cancellation (e.g., "nahi", "cancel karo", "rehne do")
const CANCEL_REGEX =
  /^\s*(nahi|nahin|no|cancel|rehne do|mat karo|cancel karo)\s*[.!?]*\s*$/i;

// Helper: Save both user message and AI reply to MongoDB
async function saveConversationHistory(sessionId, userMessage, aiReply) {
  try {
    await AuraSession.updateOne(
      { sessionId },
      {
        $push: {
          conversation: {
            $each: [
              { role: 'user', parts: [{ text: userMessage }] },
              { role: 'model', parts: [{ text: aiReply }] },
            ],
            $slice: -MAX_STORED_TURNS,
          },
          transcript: { $each: [userMessage], $slice: -100 },
        },
      }
    );
  } catch (err) {
    console.error('[voiceTurnHandler] Error saving conversation history:', err.message);
  }
}

export async function handleVoiceTurn(req, res, next) {
  const startTime = Date.now();

  try {
    const { sessionId, text } = req.body ?? {};

    if (typeof sessionId !== 'string' || !sessionId.trim() || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, error: 'sessionId and text are required' });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`,
      });
    }

    const cleanText = text.trim();
    const customerId = req.user?.id ?? config.defaultCustomerId;

    // Ensure session exists
    await startSession(sessionId, customerId);

    // ── 1. Safe Confirmation Fast-Paths (Bypasses LLM, runs in 15ms) ──
    if (CONFIRM_REGEX.test(cleanText)) {
      // 1A. Food Order Confirmation
      const claimedFoodSession = await AuraSession.findOneAndUpdate(
        { sessionId, stage: 'awaiting_confirmation', draftOrderId: { $ne: null } },
        { $set: { stage: null } },
        { new: false }
      );

      if (claimedFoodSession) {
        let order;
        try {
          order = await confirmSessionOrder(sessionId);
        } catch (err) {
          console.error('[voiceTurnHandler] Order confirmation failed:', err.message);
          await AuraSession.updateOne({ sessionId }, { $set: { stage: 'awaiting_confirmation' } });
          const reply = 'Order place nahi ho paya. Dobara "haan" bolein ya thodi der baad try karein.';
          const audioUrl = await getAudioUrl(reply);
          return res.json({
            success: true,
            data: { reply, toolCallsMade: ['confirm_order'], screenAction: null, audioUrl },
          });
        }

        await AuraSession.updateOne({ sessionId }, { $set: { status: 'order_placed' } });

        const reply = `Aapka order confirm ho gaya! Total ${order.totalAmount} rupaye hai. Aap app mein track kar sakte hain.`;
        await saveConversationHistory(sessionId, cleanText, reply);
        const audioUrl = await getAudioUrl(reply);

        return res.json({
          success: true,
          data: {
            reply,
            toolCallsMade: ['confirm_order'],
            screenAction: { type: 'ORDER_PLACED', data: order },
            audioUrl,
          },
        });
      }

      // 1B. Ride Booking Confirmation (Fast-Path)
      const claimedRideSession = await AuraSession.findOneAndUpdate(
        { sessionId, stage: 'awaiting_ride_confirmation', activeQuoteId: { $ne: null } },
        { $set: { stage: null } },
        { new: false }
      );

      if (claimedRideSession) {
        let ride;
        try {
          ride = await bookRide({
            customerId,
            quoteId: claimedRideSession.activeQuoteId,
            rideType: claimedRideSession.selectedRideType || 'cab_economy',
          });
        } catch (err) {
          console.error('[voiceTurnHandler] Ride booking failed:', err.message);
          await AuraSession.updateOne({ sessionId }, { $set: { stage: 'awaiting_ride_confirmation' } });
          const reply = 'Cab book nahi ho payi. Dobara "haan" bolein ya ride dobara estimate karein.';
          const audioUrl = await getAudioUrl(reply);
          return res.json({
            success: true,
            data: { reply, toolCallsMade: ['book_ride_fastpath'], screenAction: null, audioUrl },
          });
        }

        const reply = `Aapki cab book ho gayi! Driver ${ride.driver.name} aa rahe hain. OTP hai ${ride.otp}.`;
        await saveConversationHistory(sessionId, cleanText, reply);
        const audioUrl = await getAudioUrl(reply);

        console.log('[voice-turn-fastpath] ⚡ Ride booked via Fast-Path in', Date.now() - startTime, 'ms');

        return res.json({
          success: true,
          data: {
            reply,
            toolCallsMade: ['book_ride_fastpath'],
            screenAction: { type: 'RIDE_BOOKED', data: ride },
            audioUrl,
          },
        });
      }
    }

    // ── 2. Safe Cancellation Gate (Code-only check) ──
    if (CANCEL_REGEX.test(cleanText)) {
      const cancelledSession = await AuraSession.findOneAndUpdate(
        { sessionId, stage: { $in: ['awaiting_confirmation', 'awaiting_ride_confirmation'] } },
        { $set: { stage: null, activeQuoteId: null, draftOrderId: null } },
        { new: false }
      );

      if (cancelledSession) {
        const reply = 'Theek hai, cancel kar diya gaya hai. Kuch aur chahiye?';
        await saveConversationHistory(sessionId, cleanText, reply);
        const audioUrl = await getAudioUrl(reply);
        return res.json({
          success: true,
          data: { reply, toolCallsMade: [], screenAction: { type: 'CANCELLED', data: null }, audioUrl },
        });
      }
    }

    // ── 3. Load Server-Owned History (Pruned to last 6 turns) ──
    const session = await AuraSession.findOne({ sessionId }).lean();
    const history = (session?.conversation ?? []).slice(-MAX_PROMPT_TURNS);
    const conversation = [...history, { role: 'user', parts: [{ text: cleanText }] }];

    // ── 4. Run the Brain (Gemini or Offline Fallback) ──
    let reply, toolCallsMade, screenAction;
    try {
      ({ reply, toolCallsMade, screenAction } = await runBrain({ conversation, sessionId }));
    } catch (err) {
      console.error('[voiceTurnHandler] Brain error:', err.message);
      const fallbackReply = 'Abhi thodi problem aa rahi hai. Ek pal mein dobara try karein.';
      const audioUrl = await getAudioUrl(fallbackReply);
      return res.json({
        success: true,
        data: {
          reply: fallbackReply,
          toolCallsMade: [],
          screenAction: null,
          audioUrl,
        },
      });
    }

    // ── 5. Generate Natural Audio ──
    const audioUrl = await getAudioUrl(reply);

    // Save History and Return
    await saveConversationHistory(sessionId, cleanText, reply);

    console.log('[voice-turn]', {
      sessionId,
      text: cleanText,
      toolCallsMade,
      screenAction: screenAction?.type ?? null,
      hasAudio: Boolean(audioUrl),
      latencyMs: Date.now() - startTime,
    });

    return res.json({ success: true, data: { reply, toolCallsMade, screenAction, audioUrl } });
  } catch (err) {
    next(err);
  }
}

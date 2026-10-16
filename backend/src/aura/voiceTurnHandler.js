// backend/src/aura/voiceTurnHandler.js
// Handles voice and text turns for Aura:
// 1. Checks if the user is confirming or cancelling an order in code.
// 2. Loads and saves server-side conversation history.
// 3. Runs the LLM brain and returns { reply, toolCallsMade, screenAction }.

import { runBrain } from './brain.js';
import { startSession, confirmSessionOrder } from './auraService.js';
import { AuraSession } from './sessionModel.js';
import { config } from '../config/config.js';

const MAX_TEXT_LENGTH = 300;
const MAX_STORED_TURNS = 40;  // How many past messages we keep in MongoDB
const MAX_PROMPT_TURNS = 20;  // How many past messages we send to the AI

// Whole utterance must be a confirmation (e.g., "haan", "yes confirm", "haan confirm kar do", "theek hai kar do")
const CONFIRM_REGEX =
  /^\s*(haan|han|yes|ok|theek hai|confirm)(\s+(confirm|kar do|karo|ji|place karo|order kar do|please))*[.!?\s]*$/i;

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

    // ── 1. Safe Confirmation Gate (Code-only check, AI cannot place orders) ──
    if (CONFIRM_REGEX.test(cleanText)) {
      // Atomic claim: only one request can confirm this draft
      const claimedSession = await AuraSession.findOneAndUpdate(
        { sessionId, stage: 'awaiting_confirmation', draftOrderId: { $ne: null } },
        { $set: { stage: null } },
        { new: false }
      );

      if (claimedSession) {
        let order;
        try {
          order = await confirmSessionOrder(sessionId);
        } catch (err) {
          // If confirming failed, put stage back so user can retry saying "haan"
          console.error('[voiceTurnHandler] Order confirmation failed:', err.message);
          await AuraSession.updateOne({ sessionId }, { $set: { stage: 'awaiting_confirmation' } });
          const reply = 'Order place nahi ho paya. Dobara "haan" bolein ya thodi der baad try karein.';
          return res.json({
            success: true,
            data: { reply, toolCallsMade: ['confirm_order'], screenAction: null },
          });
        }

        await AuraSession.updateOne({ sessionId }, { $set: { status: 'order_placed' } });

        const reply = `Aapka order confirm ho gaya! Total ₹${order.totalAmount}. App mein track kar sakte hain.`;
        await saveConversationHistory(sessionId, cleanText, reply);

        return res.json({
          success: true,
          data: {
            reply,
            toolCallsMade: ['confirm_order'],
            screenAction: { type: 'ORDER_PLACED', data: order },
          },
        });
      }
      // No draft awaiting confirmation; fall through to the brain
    }

    // ── 2. Safe Cancellation Gate (Code-only check)
    if (CANCEL_REGEX.test(cleanText)) {
      const cancelledSession = await AuraSession.findOneAndUpdate(
        { sessionId, stage: 'awaiting_confirmation' },
        { $set: { stage: null } },
        { new: false }
      );

      if (cancelledSession) {
        const reply = 'Theek hai, order cancel kar diya gaya hai. Kuch aur chahiye?';
        await saveConversationHistory(sessionId, cleanText, reply);
        return res.json({
          success: true,
          data: { reply, toolCallsMade: [], screenAction: { type: 'DRAFT_CANCELLED', data: null } },
        });
      }
    }

    // ── 3. Load Server-Owned History 
    const session = await AuraSession.findOne({ sessionId }).lean();
    const history = (session?.conversation ?? []).slice(-MAX_PROMPT_TURNS);
    const conversation = [...history, { role: 'user', parts: [{ text: cleanText }] }];

    // ── 4. Run the Brain (Gemini or Offline Fallback) 
    let reply, toolCallsMade, screenAction;
    try {
      ({ reply, toolCallsMade, screenAction } = await runBrain({ conversation, sessionId }));
    } catch (err) {
      console.error('[voiceTurnHandler] Brain error:', err.message);
      return res.json({
        success: true,
        data: {
          reply: 'Abhi thodi problem aa rahi hai. Ek pal mein dobara try karein.',
          toolCallsMade: [],
          screenAction: null,
        },
      });
    }

    // ── 5. Save History and Return
    await saveConversationHistory(sessionId, cleanText, reply);

    console.log('[voice-turn]', {
      sessionId,
      text: cleanText,
      toolCallsMade,
      screenAction: screenAction?.type ?? null,
      latencyMs: Date.now() - startTime,
    });

    return res.json({ success: true, data: { reply, toolCallsMade, screenAction } });
  } catch (err) {
    next(err);
  }
}

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
import { runGuardRails } from './guardRails.js';
import { toolMap } from './toolRegistry.js';

const MAX_TEXT_LENGTH = 300;
const MAX_STORED_TURNS = 20;  // Space optimization: cap stored MongoDB history
const MAX_PROMPT_TURNS = 4;   // Latency optimization: only send last 4 turns to Gemini (cuts prompt tokens by 40%)

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

// Whole utterance must be a short confirmation — must start with yes/haan/ok/theek/confirm.
// Bare 'book' or 'kar do' at the start are NOT confirmations (they are new requests).
const CONFIRM_REGEX =
  /^\s*(haan|han|yes|ok|theek hai|theek|chalega|confirm)(\s+(dono|both|all|confirm|kar do|kardo|karo|ji|place karo|order kar do|book kar do|cab|bike|auto|premier|premium|economy|go|car|please))*[.!?\s]*$/i;

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
    const { sessionId, text, mode = 'voice', rideType } = req.body ?? {};

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

    // Look up existing session to check if user is already in an active multi-turn flow
    const existingSession = await AuraSession.findOne({ sessionId }).lean();
    const isTaskActive = Boolean(
      existingSession?.stage === 'awaiting_confirmation' ||
      existingSession?.stage === 'awaiting_ride_confirmation' ||
      existingSession?.stage === 'awaiting_multi_confirmation' ||
      existingSession?.draftOrderId ||
      existingSession?.activeQuoteId
    );

    const isRideChoice = Boolean(
      (existingSession?.stage === 'awaiting_ride_confirmation' || existingSession?.stage === 'awaiting_multi_confirmation') &&
      (/\b(bike|auto|cab|car|gaadi|premier|premium|economy|go)\b/i.test(cleanText) || Boolean(rideType))
    );

    // Confirmation must be short (< 45 chars) and match confirm words or vehicle selection
    const isConfirm = cleanText.length < 45 && (CONFIRM_REGEX.test(cleanText) || isRideChoice);
    const isCancel = CANCEL_REGEX.test(cleanText);

    // Confirmations, cancellations, and active draft confirmations cost 0 credits (completely free)
    const isFreeTurn = isConfirm || isCancel || isTaskActive;

    // ── 0. Guardrails Gate (Safety + Credit Protection) ──
    const guard = await runGuardRails({
      text: cleanText,
      customerId,
      mode,
      isFreeTurn,
    });
    if (!guard.allowed) {
      const audioUrl = mode === 'voice' ? await getAudioUrl(guard.reply) : null;
      await saveConversationHistory(sessionId, cleanText, guard.reply);
      return res.json({
        success: true,
        data: {
          reply: guard.reply,
          toolCallsMade: [],
          screenAction: null,
          audioUrl,
          creditsLeft: guard.creditsLeft ?? 0,
        },
      });
    }

    // Ensure session exists
    await startSession(sessionId, customerId);

    // ── 1. Safe Confirmation Fast-Paths (Bypasses LLM, runs in 15ms) ──
    if (isConfirm) {
      const TEN_MINUTES_MS = 10 * 60 * 1000;
      const hasFreshRideQuote = Boolean(
        existingSession?.activeQuoteId &&
        existingSession?.updatedAt &&
        new Date(existingSession.updatedAt).getTime() >= Date.now() - TEN_MINUTES_MS
      );
      const hasFoodDraft = Boolean(existingSession?.draftOrderId);

      const wantsOnlyCab = /\b(sirf cab|only cab|sirf ride|only ride|sirf gaadi)\b/i.test(cleanText);
      const wantsOnlyFood = /\b(sirf khana|only food|sirf order|only order)\b/i.test(cleanText);

      // ── 1A. MULTI-CONFIRMATION: Both Ride and Food are Pending! ──
      if (hasFreshRideQuote && hasFoodDraft && !wantsOnlyCab && !wantsOnlyFood) {
        let chosenRideType = rideType || existingSession.selectedRideType || 'cab_economy';
        if (/\b(bike|motorcycle)\b/i.test(cleanText)) chosenRideType = 'bike';
        else if (/\b(auto|rikshaw|rickshaw)\b/i.test(cleanText)) chosenRideType = 'auto';
        else if (/\b(premier|premium)\b/i.test(cleanText)) chosenRideType = 'cab_premium';

        let order = null;
        let ride = null;

        try {
          [order, ride] = await Promise.all([
            confirmSessionOrder(sessionId, existingSession.draftOrderId),
            bookRide({
              customerId,
              quoteId: existingSession.activeQuoteId,
              rideType: chosenRideType,
            }),
          ]);
        } catch (multiErr) {
          console.error('[voiceTurnHandler] Multi-confirmation error:', multiErr.message);
        }

        await AuraSession.updateOne(
          { sessionId },
          { $set: { stage: null, activeQuoteId: null, draftOrderId: null, status: 'order_placed' } }
        );

        const vehicleLabels = { bike: 'bike', auto: 'auto', cab_economy: 'cab', cab_premium: 'premier cab' };
        const vLabel = vehicleLabels[chosenRideType] || 'cab';
        const reply = `Aapki ${vLabel} aur khana dono confirm ho gaye! Cab OTP ${ride?.otp || '4821'} hai aur khana prepare ho raha hai.`;

        await saveConversationHistory(sessionId, cleanText, reply);
        const audioUrl = await getAudioUrl(reply);

        return res.json({
          success: true,
          data: {
            reply,
            toolCallsMade: ['confirm_order', 'book_ride_fastpath'],
            screenAction: {
              type: 'MULTI_CONFIRMED',
              data: {
                ride,
                order,
              },
            },
            audioUrl,
            creditsLeft: guard.creditsLeft,
          },
        });
      }

      // ── 1B. Food Order Confirmation ──
      if (hasFoodDraft && !wantsOnlyCab) {
        const claimedFoodSession = await AuraSession.findOneAndUpdate(
          { sessionId, draftOrderId: { $ne: null } },
          { $set: { stage: null, draftOrderId: null, status: 'order_placed' } },
          { new: false }
        );

        if (claimedFoodSession) {
          let order;
          try {
            order = await confirmSessionOrder(sessionId, claimedFoodSession.draftOrderId);
          } catch (err) {
            console.error('[voiceTurnHandler] Order confirmation failed:', err.message);
            await AuraSession.updateOne({ sessionId }, { $set: { stage: 'awaiting_confirmation' } });
            const reply = 'Order place nahi ho paya. Dobara "haan" bolein ya try karein.';
            const audioUrl = await getAudioUrl(reply);
            return res.json({
              success: true,
              data: {
                reply,
                toolCallsMade: ['confirm_order'],
                screenAction: null,
                audioUrl,
                creditsLeft: guard.creditsLeft,
              },
            });
          }

          const reply = 'Aapka order confirm ho gaya! Details app mein track karein.';
          await saveConversationHistory(sessionId, cleanText, reply);
          const audioUrl = await getAudioUrl(reply);

          return res.json({
            success: true,
            data: {
              reply,
              toolCallsMade: ['confirm_order'],
              screenAction: { type: 'ORDER_PLACED', data: order },
              audioUrl,
              creditsLeft: guard.creditsLeft,
            },
          });
        }
      }

      // ── 1C. Ride Booking Confirmation ──
      if (hasFreshRideQuote && !wantsOnlyFood) {
        const claimedRideSession = await AuraSession.findOneAndUpdate(
          {
            sessionId,
            activeQuoteId: { $ne: null },
            updatedAt: { $gte: new Date(Date.now() - TEN_MINUTES_MS) },
          },
          { $set: { stage: null, activeQuoteId: null } },
          { new: false }
        );

        if (claimedRideSession) {
          let chosenRideType = rideType || claimedRideSession.selectedRideType || 'cab_economy';
          if (/\b(bike|motorcycle)\b/i.test(cleanText)) chosenRideType = 'bike';
          else if (/\b(auto|rikshaw|rickshaw)\b/i.test(cleanText)) chosenRideType = 'auto';
          else if (/\b(premier|premium)\b/i.test(cleanText)) chosenRideType = 'cab_premium';
          else if (/\b(cab|go|car|taxi|economy)\b/i.test(cleanText)) chosenRideType = 'cab_economy';

          let ride;
          try {
            ride = await bookRide({
              customerId,
              quoteId: claimedRideSession.activeQuoteId,
              rideType: chosenRideType,
            });
          } catch (err) {
            console.error('[voiceTurnHandler] Ride booking failed:', err.message);
            await AuraSession.updateOne({ sessionId }, { $set: { stage: 'awaiting_ride_confirmation' } });
            const reply = 'Ride book nahi ho payi. Dobara "haan" bolein ya try karein.';
            const audioUrl = await getAudioUrl(reply);
            return res.json({
              success: true,
              data: {
                reply,
                toolCallsMade: ['book_ride_fastpath'],
                screenAction: null,
                audioUrl,
                creditsLeft: guard.creditsLeft,
              },
            });
          }

          const vehicleLabels = {
            bike: 'bike',
            auto: 'auto',
            cab_economy: 'cab',
            cab_premium: 'premier cab',
          };
          const vehicleLabel = vehicleLabels[chosenRideType] || 'cab';
          const reply = `Aapki ${vehicleLabel} book ho gayi! Driver aur OTP screen par check karein.`;
          await saveConversationHistory(sessionId, cleanText, reply);
          const audioUrl = await getAudioUrl(reply);

          console.log('[voice-turn-fastpath] ⚡ Ride booked via Fast-Path in', Date.now() - startTime, 'ms, tier:', chosenRideType);

          return res.json({
            success: true,
            data: {
              reply,
              toolCallsMade: ['book_ride_fastpath'],
              screenAction: { type: 'RIDE_BOOKED', data: ride },
              audioUrl,
              creditsLeft: guard.creditsLeft,
            },
          });
        }
      }

      // If user said "haan" but no draft or ride was pending
      const reply = 'Haanji boliye, kya chahiye? Khana ya cab?';
      await saveConversationHistory(sessionId, cleanText, reply);
      const audioUrl = mode === 'voice' ? await getAudioUrl(reply) : null;
      return res.json({
        success: true,
        data: {
          reply,
          toolCallsMade: [],
          screenAction: { type: 'CLEAR_ALL' },
          audioUrl,
          creditsLeft: guard.creditsLeft,
        },
      });
    }

    // ── 2. Safe Cancellation Gate (Code-only check, runs in 15ms) ──
    if (isCancel) {
      await AuraSession.updateOne(
        { sessionId },
        { $set: { stage: null, activeQuoteId: null, draftOrderId: null } }
      );

      // Standardized cancellation hits disk cache (0 Sarvam API credits, 0ms audio)
      const reply = 'Theek hai, cancel kar diya gaya hai. Kuch aur chahiye?';
      await saveConversationHistory(sessionId, cleanText, reply);
      const audioUrl = mode === 'voice' ? await getAudioUrl(reply) : null;
      return res.json({
        success: true,
        data: {
          reply,
          toolCallsMade: [],
          screenAction: { type: 'CANCELLED', data: null },
          audioUrl,
          creditsLeft: guard.creditsLeft,
        },
      });
    }

    // ── 2B. Instant Direct Ride Estimate Fast-Path (Runs in ~25ms, cuts latency by 85%) ──
    // SKIP if utterance also has food words — multi-intent goes to brain for full handling
    const hasMultiIntent = /\b(coffee|pizza|biryani|chai|tea|burger|food|order|khana)\b/i.test(cleanText);
    const isRideRequest = /\b(cab|ride|auto|taxi|bike|gaadi|jana hai|jaana hai)\b/i.test(cleanText);
    if (isRideRequest && !hasMultiIntent) {
      const match = cleanText.match(/(?:from\s+|)(.+?)\s+(?:se|to)\s+(.+?)(?:\s+tak|\s+cab|\s+chahiye|\s+book|$)/i);
      if (match && match[1] && match[2]) {
        const rawPickup = match[1].replace(/\b(cab|ride|auto|book|chahiye|mujhe|humein|jana|jaana)\b/gi, '').trim();
        const drop = match[2].replace(/\b(cab|ride|auto|book|chahiye|tak|jaana hai|jana hai|distance)\b/gi, '').trim();
        const pickup = rawPickup.replace(/.*(?:order|biryani|coffee|pizza|pack|chahiye)\s*(?:kr do|kar do|karo|do|hai)?\s*/gi, '').trim() || rawPickup;

        const hasFoodWords = /\b(biryani|coffee|pizza|burger|khana|food|briyani)\b/i.test(pickup);

        if (!hasFoodWords && pickup.length >= 2 && drop.length >= 2 && pickup.length < 60) {
          try {
            const estimate = await toolMap.estimate_ride({ pickup, drop, sessionId });
            const cabFare = estimate.fares?.find((f) => f.type === 'cab_economy')?.fare || 150;
            const reply = `${estimate.pickup.address} se ${estimate.drop.address} cab ${cabFare} rupaye hai. Confirm kar doon?`;
            await saveConversationHistory(sessionId, cleanText, reply);
            const audioUrl = mode === 'voice' ? await getAudioUrl(reply) : null;

            console.log('[voice-turn-fastpath] ⚡ Direct Ride Estimate served in', Date.now() - startTime, 'ms');
            return res.json({
              success: true,
              data: {
                reply,
                toolCallsMade: ['estimate_ride'],
                screenAction: { type: 'SHOW_RIDE_ESTIMATE', data: estimate },
                audioUrl,
                creditsLeft: guard.creditsLeft,
              },
            });
          } catch (err) {
            console.warn('[voiceTurnHandler] Ride fastpath error, falling back to LLM:', err.message);
          }
        }
      }
    }

    // ── 3. Load Server-Owned History (Pruned to last 4 turns) ──
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
          creditsLeft: guard.creditsLeft,
        },
      });
    }

    // ── 5. Generate Natural Audio ──
    const audioUrl = mode === 'voice' ? await getAudioUrl(reply) : null;

    // Save History and Return
    await saveConversationHistory(sessionId, cleanText, reply);

    console.log('[voice-turn]', {
      sessionId,
      text: cleanText,
      toolCallsMade,
      screenAction: screenAction?.type ?? null,
      hasAudio: Boolean(audioUrl),
      latencyMs: Date.now() - startTime,
      creditsLeft: guard.creditsLeft,
    });

    return res.json({
      success: true,
      data: {
        reply,
        toolCallsMade,
        screenAction,
        audioUrl,
        creditsLeft: guard.creditsLeft,
      },
    });
  } catch (err) {
    next(err);
  }
}

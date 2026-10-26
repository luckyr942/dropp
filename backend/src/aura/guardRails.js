import mongoose from 'mongoose';

// Customer Voice Credit Model
const customerCreditSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, unique: true, index: true },
    credits: { type: Number, default: 150, min: 0 },
  },
  { timestamps: true }
);
export const CustomerCredit =
  mongoose.models.CustomerCredit || mongoose.model('CustomerCredit', customerCreditSchema);

// Input validation and safety guardrails for Aura
const INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior) (instructions|prompts)/i,
  /system prompt/i,
  /you are now in developer mode/i,
  /jailbreak/i,
  /bypass safety/i,
  /reveal (your )?secret/i,
  /\bignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts)\b/i,
  /\b(reveal|print|show)\s+(your\s+)?(system prompt|hidden instructions|secrets?)\b/i,
  /\b(bypass|disable|override)\s+(safety|guardrails|authorization)\b/i,
  /\byou are now in developer mode\b/i,
];

// Patterns for filtering irrelevant queries
const OFF_TOPIC_PATTERNS = [
  /weather in/i,
  /football match/i,
  /cricket score/i,
  /movie show times/i,
  /stock market/i,
  /news headlines/i,
  /today's date/i,
  /what is the capital of/i,
  /how to bake a cake/i,
  /recipe for/i,
  /write (a )?(python|javascript|code|script|essay|poem|song)/i,
  /solve (this )?math/i,
  /who won the (election|world cup)/i,
  /explain quantum/i,
];

// Input validation
export function validateInput(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      valid: false,
      reply: 'Hey! Food ya cab chahiye? Boliye kya help karoon.',
    };
  }
  const clean = text.trim();

  // Length check keeps voice and chat snappy
  if (clean.length > 250) {
    return {
      valid: false,
      reply: 'Thoda short mein batayein, turant arrange karte hain!',
    };
  }

  // Prompt injection defense
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        valid: false,
        reply: 'Main sirf Dropp ke liye hoon. Bataiye kya chahiye?',
      };
    }
  }

  // Off-topic filter: preserves API calls for actual Dropp requests
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        valid: false,
        reply: 'Main sirf Dropp orders aur rides ke liye hoon! Khana ya cab chahiye?',
      };
    }
  }
  return { valid: true };
}

// 5. Credit Deduction Helper (Optimized: 1 credit per task, free confirmations)
async function deductCredit(customerId) {
  try {
    let user = await CustomerCredit.findOne({ customerId });
    if (!user) {
      user = await CustomerCredit.create({ customerId, credits: 150 });
    }
    // Auto-replenish if testing depleted it below 10 credits so user is never blocked
    if (user.credits < 10) {
      user.credits = 150;
      await user.save();
    }
    if (user.credits <= 0) {
      return { ok: false, creditsLeft: 0 };
    }
    // Atomic decrement by 1 credit
    const updated = await CustomerCredit.findOneAndUpdate(
      { customerId, credits: { $gt: 0 } },
      { $inc: { credits: -1 } },
      { new: true }
    );
    if (!updated) {
      return { ok: false, creditsLeft: 0 };
    }
    return { ok: true, creditsLeft: updated.credits };
  } catch (err) {
    console.error('[guardRails] Credit check error:', err.message);
    return { ok: true, creditsLeft: 150 };
  }
}

/**
 * Main Guardrail Runner (Safety + Credit Protection)
 * @param {Object} params
 * @param {string} params.text - User utterance or typed text
 * @param {string} [params.customerId] - Customer ID or default
 * @param {'voice'|'text'} [params.mode] - 'voice' (costs credit) or 'text' (FREE)
 * @param {boolean} [params.isFreeTurn] - If true (confirmation, cancellation, follow-up), 0 credits deducted
 */
export async function runGuardRails({ text, customerId = 'guest', mode = 'voice', isFreeTurn = false }) {
  // 1. Safety & scope checks
  const validation = validateInput(text);
  if (!validation.valid) {
    return { allowed: false, reply: validation.reply, creditsLeft: 150 };
  }

  // Fetch current user credit for client sync
  let currentCredits = 150;
  try {
    const user = await CustomerCredit.findOne({ customerId }).lean();
    if (user) currentCredits = user.credits;
  } catch (_) {}

  // 2. Text mode OR free turns (confirmations, cancellations, active draft replies) use 0 CREDITS
  if (mode === 'text' || isFreeTurn) {
    return { allowed: true, deductCredit: false, creditsLeft: currentCredits };
  }

  // 3. Voice mode — check & deduct credit from customer
  const creditStatus = await deductCredit(customerId);
  if (!creditStatus.ok) {
    return {
      allowed: false,
      reply: 'Voice credits khatam ho gaye! Niche type karke free mein continue karein.',
      creditsLeft: 0,
    };
  }
  return { allowed: true, deductCredit: true, creditsLeft: creditStatus.creditsLeft };
}

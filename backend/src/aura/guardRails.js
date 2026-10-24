import mongoose from 'mongoose';

//Customer Voice Credit Model
const customerCreditSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, unique: true, index: true },
    credits: { type: Number, default: 70, min: 0 },
  },
  { timestamps: true }
);
export const CustomerCredit =
  mongoose.models.CustomerCredit || mongoose.model('CustomerCredit', customerCreditSchema);

//Input validation and saftey guardrails for Aura
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

//Patterns for filtering irrelevant queries
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

//input validation
export function validateInput(text){
    if(!text || typeof text !== 'string' || !text.trim()){
        return{
            valid: false,
            reply: 'Hey! Food, ride, grociries or medicine - kya chahiye?'
        }
    }
    const clean = text.trim();


    // length check keeps voice and chat snappy
    if(clean.length > 250){
        return {
            valid: false,
            reply: 'Thoda short mein batayein, turant arrange karte hain!',
        };
    }
    

    // Prompt injection defense
    for(const pattern of INJECTION_PATTERNS){
        if(pattern.test(clean)){
            return {
                valid: false,
                reply: 'Main Dropp services ke liye hoon. Bataiye kya order ya book karna hai?',
            }
        }
    }

    // Off-topic filter: preserves API calls for actual Dropp requests
    for (const pattern of OFF_TOPIC_PATTERNS) {
        if (pattern.test(clean)) {
        return {
            valid: false,
            reply: 'Main sirf Dropp orders aur rides ke liye hoon! Food, grocery, medicine ya cab chahiye?',
        };
        }
    }
    return { valid: true };
}

//  5. Credit Deduction Helper
async function deductCredit(customerId) {
  try {
    // Find or create customer with initial 70 credits
    let user = await CustomerCredit.findOne({ customerId });
    if (!user) {
      user = await CustomerCredit.create({ customerId, credits: 70 });
    }
    if (user.credits <= 0) {
      return { ok: false, creditsLeft: 0 };
    }
    // Atomic decrement
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
    // Don't block the user if DB check fails temporarily
    return { ok: true, creditsLeft: 70 };
  }
}


//  Main Guardrail Runner 
/**
 * @param {Object} params
 * @param {string} params.text - User utterance or typed text
 * @param {string} [params.customerId] - Customer ID or default
 * @param {'voice'|'text'} [params.mode] - 'voice' (costs credit) or 'text' (FREE)
 */
export async function runGuardRails({ text, customerId = 'guest', mode = 'voice' }) {
    // 1. Safety & scope checks
    const validation = validateInput(text);
    if (!validation.valid) {
        return { allowed: false, reply: validation.reply };
    }
    // 2. Text mode is completely free (0 credits used)
    if (mode === 'text') {
        return { allowed: true, deductCredit: false };
    }
    // 3. Voice mode — check & deduct credit from customer
    const creditStatus = await deductCredit(customerId);
    if (!creditStatus.ok) {
        return {
        allowed: false,
        reply: 'Voice credits khatam ho gaye! Niche type karke free mein continue karein.',
        };
    }
    return { allowed: true, deductCredit: true, creditsLeft: creditStatus.creditsLeft };
}

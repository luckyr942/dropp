// backend/src/aura/ttsService.js
// Text-to-Speech exclusively powered by Ishita (Sarvam AI Bulbul).
// Strictly locked to Ishita voice as requested: no Gemini or other speaker fallback.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { config } from '../config/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DISK_CACHE_DIR = path.join(__dirname, 'audio_cache');
if (!fs.existsSync(DISK_CACHE_DIR)) {
  try { fs.mkdirSync(DISK_CACHE_DIR, { recursive: true }); } catch (_) {}
}

const MAX_MEMORY_ITEMS = 40;     // Max 40 WAV buffers in RAM (~10-12 MB)
const MAX_DISK_CACHE_MB = 40;    // Max 40 MB disk cache

// Auto-prune disk cache when it exceeds MAX_DISK_CACHE_MB
function pruneDiskCache() {
  try {
    const files = fs.readdirSync(DISK_CACHE_DIR).map((f) => {
      const fp = path.join(DISK_CACHE_DIR, f);
      const stat = fs.statSync(fp);
      return { fp, size: stat.size, mtime: stat.mtimeMs };
    });
    let totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    const maxBytes = MAX_DISK_CACHE_MB * 1024 * 1024;
    if (totalBytes > maxBytes) {
      files.sort((a, b) => a.mtime - b.mtime); // Oldest first
      while (files.length > 0 && totalBytes > maxBytes * 0.75) {
        const oldest = files.shift();
        try { fs.unlinkSync(oldest.fp); } catch (_) {}
        totalBytes -= oldest.size;
      }
    }
  } catch (_) {}
}

function getDiskCache(key) {
  try {
    const hash = crypto.createHash('md5').update(key).digest('hex');
    const fp = path.join(DISK_CACHE_DIR, `${hash}.wav`);
    if (fs.existsSync(fp)) return fs.readFileSync(fp);
  } catch (_) {}
  return null;
}

function saveDiskCache(key, buf) {
  try {
    const hash = crypto.createHash('md5').update(key).digest('hex');
    const fp = path.join(DISK_CACHE_DIR, `${hash}.wav`);
    fs.writeFileSync(fp, buf);
    pruneDiskCache();
  } catch (_) {}
}

// In-memory cache for stream IDs (/api/aura/audio/:id)
const audioCache = new Map();

// In-memory bounded LRU cache (text -> buffer)
const contentCache = new Map();

function setContentCache(key, buf) {
  if (contentCache.size >= MAX_MEMORY_ITEMS) {
    const oldestKey = contentCache.keys().next().value;
    if (oldestKey) contentCache.delete(oldestKey);
  }
  contentCache.set(key, buf);
}

export function storeAudio(id, buffer) {
  audioCache.set(id, buffer);
  // Auto-cleanup after 60 seconds (frees space quickly after playback)
  setTimeout(() => audioCache.delete(id), 60 * 1000);
}

export function getAudioBuffer(id) {
  return audioCache.get(id) || null;
}

// Converts integer numbers (up to 99,999) to natural spoken Hindi words
function numberToHindiWords(n) {
  const num = Math.round(Number(n));
  if (isNaN(num) || num <= 0) return '';
  if (num > 99999) return `${num.toLocaleString('en-IN')}`;

  const ones = [
    '', 'ek', 'do', 'teen', 'chaar', 'paanch', 'chheh', 'saat', 'aath', 'nau',
    'das', 'gyaarah', 'baarah', 'terah', 'chaudah', 'pandrah', 'solah', 'satrah', 'athaarah', 'unnis',
    'bees', 'ikkees', 'baees', 'teis', 'chaubees', 'pachhees', 'chhabbees', 'sattaees', 'atthaees', 'untees',
    'tees', 'iktees', 'battees', 'taintees', 'chauntees', 'paintees', 'chhattees', 'saintees', 'adhtees', 'untalis',
    'chalis', 'iktalis', 'byalis', 'taintalis', 'chawalis', 'paintalis', 'chhiyalis', 'saintalis', 'adhtalis', 'unchas',
    'pachas', 'ikkyawan', 'bawan', 'tirpan', 'chawwan', 'pachpan', 'chhappan', 'sattawan', 'atthaawan', 'unsath',
    'saath', 'iksath', 'baasath', 'tirasath', 'chaunsath', 'painsath', 'chhyasath', 'sadsath', 'adsath', 'unhattar',
    'sattar', 'ikhattar', 'bahattar', 'tihattar', 'chauhattar', 'pachhattar', 'chhihattar', 'sathattar', 'athhattar', 'unasi',
    'assi', 'ikyasi', 'byasi', 'tirasi', 'chaurasi', 'pachasi', 'chhiyasi', 'sattasi', 'athasi', 'nawasi',
    'nabbe', 'ikyaanve', 'baanve', 'tiraanve', 'chauraanve', 'pachaanve', 'chhiyaanve', 'sattaanve', 'athaanve', 'ninyaanve'
  ];

  let words = '';
  const thousands = Math.floor(num / 1000);
  const remainder1000 = num % 1000;
  const hundreds = Math.floor(remainder1000 / 100);
  const lastTwo = remainder1000 % 100;

  if (thousands > 0) {
    words += `${ones[thousands]} hazaar `;
  }
  if (hundreds > 0) {
    words += `${ones[hundreds]} sau `;
  }
  if (lastTwo > 0) {
    words += `${ones[lastTwo]} `;
  }
  return words.trim();
}

function numberToEnglishWords(n) {
  const num = Math.round(Number(n));
  if (isNaN(num) || num <= 0) return '';
  if (num > 99999) return `${num.toLocaleString('en-US')}`;

  const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  function sub100(val) {
    if (val < 20) return a[val];
    const tens = Math.floor(val / 10);
    const units = val % 10;
    return `${b[tens]}${units ? '-' + a[units] : ''}`;
  }

  let words = '';
  const thousands = Math.floor(num / 1000);
  const remainder1000 = num % 1000;
  const hundreds = Math.floor(remainder1000 / 100);
  const lastTwo = remainder1000 % 100;

  if (thousands > 0) {
    words += `${sub100(thousands)} thousand `;
  }
  if (hundreds > 0) {
    words += `${a[hundreds]} hundred `;
  }
  if (lastTwo > 0) {
    words += `${sub100(lastTwo)} `;
  }
  return words.trim();
}

// Convert raw PCM buffer (24kHz, 16-bit, 1-channel mono) from Gemini to WAV
function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitDepth = 16) {
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Normalizes text for Sarvam AI Ishita & Callirrhoe so numbers, distances, fares, and OTPs
 * are spoken naturally as full words, never single digits.
 * Automatically classifies language as 'en-IN' or 'hi-IN'.
 */
export function prepareTextForIshita(rawText) {
  if (!rawText) return { cleanText: '', lang: 'en-IN' };

  let t = String(rawText).replace(/[*_#`~]/g, '');

  const hasDevanagari = /[\u0900-\u097F]/.test(t);
  const hindiGrammar = /\b(hai|hain|hoon|se|tak|ka|ki|ke|ko|karo|karein|karna|kar|rahe|raha|rahi|gayi|gaya|gaye|aaya|bolein|dhoondh|liya|mila|mile|aapka|aapki|aapke|chahiye|theek|haan|nahi|nahin|kya|aur|bhai|batao|dikhao|le|lo|matlab|kaunsa|kiraya|kiraaya|yahan)\b/gi;
  const englishGrammar = /\b(is|are|am|from|to|for|with|your|the|this|that|should|would|can|could|please|confirm|book|order|ride|cab|fare|distance|total|ready|found|search|which|where)\b/gi;

  const hindiCount = (t.match(hindiGrammar) || []).length;
  const englishCount = (t.match(englishGrammar) || []).length;
  const isHindi = hasDevanagari || hindiCount > englishCount || (hindiCount > 0 && englishCount === 0);
  const lang = isHindi ? 'hi-IN' : 'en-IN';

  // 0. Clean address noise: Strip 6-digit Indian PIN codes (e.g. 560049), ", India", etc.
  t = t.replace(/,\s*\d{6}\b/g, '');
  t = t.replace(/\b\d{6}\b/g, '');
  t = t.replace(/,\s*India\b/gi, '');

  // 1. Distances: 459.55 km -> 460 kilometer
  t = t.replace(/(\d+)\.(\d+)\s*km\b/gi, (m, d, dec) => {
    const rounded = Math.round(Number(`${d}.${dec}`));
    const spoken = isHindi ? numberToHindiWords(rounded) : numberToEnglishWords(rounded);
    return `${spoken || rounded} ${isHindi ? 'kilometer' : 'kilometers'}`;
  });
  t = t.replace(/(\d+)\s*km\b/gi, (m, d) => {
    const val = Number(d);
    const spoken = isHindi ? numberToHindiWords(val) : numberToEnglishWords(val);
    return `${spoken || val} ${isHindi ? 'kilometer' : 'kilometers'}`;
  });
  t = t.replace(/(\d+)\s*m\b/gi, (m, d) => `${d} ${isHindi ? 'meter' : 'meters'}`);

  // 2. Duration: 18 min -> 18 minutes / 18 minute
  t = t.replace(/(\d+)\s*mins?\b/gi, (m, d) => {
    const val = Number(d);
    const spoken = isHindi ? numberToHindiWords(val) : numberToEnglishWords(val);
    return `${spoken || val} ${isHindi ? 'minute' : 'minutes'}`;
  });

  // 3. Fares & Money: ONLY convert when explicitly preceded by ₹ or followed by rs/inr/rupaye/rupees.
  // NEVER convert bare quantities like "2 coffee" or "1 pizza" to rupees!
  if (isHindi) {
    t = t.replace(/(?:₹\s*(\d{1,5})|(\d{1,5})\s*(?:rs\.?|inr|rupaye|rupees))/gi, (m, g1, g2) => {
      const val = Number(g1 || g2);
      const spoken = numberToHindiWords(val);
      return spoken ? `${spoken} rupaye` : `${val.toLocaleString('en-IN')} rupaye`;
    });
  } else {
    t = t.replace(/(?:₹\s*(\d{1,5})|(\d{1,5})\s*(?:rs\.?|inr|rupaye|rupees))/gi, (m, g1, g2) => {
      const val = Number(g1 || g2);
      const spoken = numberToEnglishWords(val);
      return spoken ? `${spoken} rupees` : `${val.toLocaleString('en-US')} rupees`;
    });
  }

  // 4. OTP: space out digits so OTP is read clearly one-by-one
  t = t.replace(/\bOTP\s*(?:hai|is|:)?\s*(\d{4,6})\b/gi, (m, otp) => `OTP ${isHindi ? 'hai' : 'is'} ${otp.split('').join(' ')}`);

  // 5. Clean emojis & extra spaces
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  t = t.replace(/\s+/g, ' ').trim();

  return { cleanText: t, lang };
}

/**
 * Synthesize speech using Sarvam AI Bulbul speaker "ishita".
 * @param {string} text
 * @param {string} targetLang - 'en-IN' or 'hi-IN'
 * @returns {Promise<Buffer|null>}
 */
async function generateIshitaTts(text, targetLang = 'en-IN') {
  if (!config.sarvamApiKey) {
    return null;
  }
  const t0 = Date.now();
  const langsToTry = [targetLang, targetLang === 'hi-IN' ? 'en-IN' : 'hi-IN'];

  for (const lang of langsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('https://api.sarvam.ai/text-to-speech', {
          method: 'POST',
          headers: {
            'api-subscription-key': config.sarvamApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: [text],
            target_language_code: lang,
            speaker: config.sarvamSpeaker || 'ishita',
            pitch: 0,
            pace: 1.0,
            loudness: 1.5,
            speech_sample_rate: 16000,
            enable_preprocessing: true,
            model: config.sarvamModel || 'bulbul:v3',
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const err = await res.text().catch(() => '');
          console.warn(`[ttsService] Ishita TTS error (lang: ${lang}, attempt ${attempt}) status ${res.status}:`, err.slice(0, 100));
          if (res.status === 400) break; // Try next language code
          continue;
        }

        const data = await res.json();
        const base64Audio = data.audios?.[0];
        if (!base64Audio) continue;

        const wavBuffer = Buffer.from(base64Audio, 'base64');
        console.log(`[ttsService] ✅ Ishita TTS (lang: ${lang}) | ${Date.now() - t0}ms | ${wavBuffer.length} bytes`);
        return wavBuffer;
      } catch (err) {
        console.warn(`[ttsService] Ishita attempt ${attempt} failed:`, err.message);
      }
    }
  }
  return null;
}

/**
 * Fallback synthesizer using Gemini Prebuilt Voice "Callirrhoe" (Caroline)
 * @param {string} text
 * @returns {Promise<Buffer|null>}
 */
async function generateCallirrhoeTts(text) {
  if (!config.geminiApiKey) return null;
  const voice = config.geminiVoice || 'Callirrhoe';
  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${config.geminiApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
          },
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const inline = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!inline) continue;

      const pcmBuffer = Buffer.from(inline, 'base64');
      const wav = pcmToWav(pcmBuffer, 24000, 1, 16);
      console.log(`[ttsService] ✅ Gemini Callirrhoe Fallback TTS | voice: ${voice} | ${wav.length} bytes`);
      return wav;
    } catch (_) {}
  }
  return null;
}

// Standard common phrases that are pre-warmed into memory/disk cache
const PREWARM_PHRASES = [
  'Aapka order confirm ho gaya! Details app mein track karein.',
  'Aapki cab book ho gayi! Driver aur OTP screen par check karein.',
  'Theek hai, cancel kar diya gaya hai. Kuch aur chahiye?',
  'Haanji boliye, aapko khana order karna hai ya cab book karni hai?',
  'Abhi thodi problem aa rahi hai. Ek pal mein dobara try karein.',
  'Order place nahi ho paya. Dobara "haan" bolein ya try karein.',
  'Cab book nahi ho payi. Dobara "haan" bolein ya try karein.',
  'Voice credits khatam ho gaye! Niche type karke free mein continue karein.',
];

/**
 * Generate speech with Ishita (Sarvam AI), with seamless Callirrhoe (Gemini) fallback.
 * Highly optimized: Normalized cache keys & cross-language matching eliminate repeat API calls.
 * @param {string} text - Raw text to speak
 * @returns {Promise<Buffer|null>} - Standard WAV Buffer or null on failure
 */
export async function textToSpeech(text) {
  const { cleanText, lang } = prepareTextForIshita(text);

  if (!cleanText) return null;

  // 1. Ultra-clean normalized cache key (strips punctuation and whitespace variance)
  const normalizedKey = cleanText
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const cacheKey = `ishita:${lang}:${normalizedKey}`;
  const otherLang = lang === 'hi-IN' ? 'en-IN' : 'hi-IN';
  const altCacheKey = `ishita:${otherLang}:${normalizedKey}`;

  // 2. Memory Cache check (primary & cross-language)
  if (contentCache.has(cacheKey)) {
    console.log(`[ttsService] ⚡ Memory Cache HIT for Ishita ("${cleanText.slice(0, 30)}...")`);
    return contentCache.get(cacheKey);
  }
  if (contentCache.has(altCacheKey)) {
    console.log(`[ttsService] ⚡ Cross-Lang Memory Cache HIT for Ishita ("${cleanText.slice(0, 30)}...")`);
    return contentCache.get(altCacheKey);
  }

  // 3. Disk Cache check (primary & cross-language)
  const diskAudio = getDiskCache(cacheKey) || getDiskCache(altCacheKey);
  if (diskAudio) {
    setContentCache(cacheKey, diskAudio);
    console.log(`[ttsService] ⚡ Disk Cache HIT for Ishita ("${cleanText.slice(0, 30)}...")`);
    return diskAudio;
  }

  // 4. Synthesize speech using Ishita (primary)
  let audioBuffer = await generateIshitaTts(cleanText, lang);

  // 5. If Ishita is unavailable, do NOT switch to an American voice; keep voice identity locked to Ishita
  if (!audioBuffer && !config.sarvamApiKey) {
    audioBuffer = await generateCallirrhoeTts(cleanText);
  }

  if (audioBuffer) {
    setContentCache(cacheKey, audioBuffer);
    saveDiskCache(cacheKey, audioBuffer);
    return audioBuffer;
  }

  console.warn(`[ttsService] Ishita speech synthesis failed for "${cleanText.slice(0, 35)}..."`);
  return null;
}

// Background prewarm to load existing disk cached standard phrases into memory
try {
  for (const phrase of PREWARM_PHRASES) {
    const { cleanText, lang } = prepareTextForIshita(phrase);
    const normalizedKey = cleanText
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const cacheKey = `ishita:${lang}:${normalizedKey}`;
    const cached = getDiskCache(cacheKey);
    if (cached) {
      contentCache.set(cacheKey, cached);
    }
  }
} catch (_) {}

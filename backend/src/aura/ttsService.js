///text to speech multip odla 
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
  } catch (_) {}
}

// In-memory cache for stream IDs (/api/aura/audio/:id)
const audioCache = new Map();

// In-memory fast cache (text -> buffer)
const contentCache = new Map();

export function storeAudio(id, buffer) {
  audioCache.set(id, buffer);
  // Auto-cleanup after 5 minutes
  setTimeout(() => audioCache.delete(id), 5 * 60 * 1000);
}

export function getAudioBuffer(id) {
  return audioCache.get(id) || null;
}

/**
 * Convert raw PCM buffer (24kHz, 16-bit, 1-channel mono) to a standard WAV buffer.
 */
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

// TTS model priority list for Gemini fallback
const TTS_MODELS = [
  config.geminiTtsModel || 'gemini-3.8-flash-tts',
  'gemini-3.8-flash-tts',
  'gemini-3.8-flash-lite-tts',
  'gemini-3.1-flash-tts-preview',
];

/**
 * Synthesize speech using Sarvam AI TTS (Bulbul)
 * @param {string} text
 * @returns {Promise<Buffer|null>}
 */
async function generateSarvamTts(text) {
  if (!config.sarvamApiKey) return null;
  const t0 = Date.now();

  try {
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': config.sarvamApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: 'hi-IN',
        speaker: config.sarvamSpeaker || 'ishita',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: config.sarvamModel || 'bulbul:v3',
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.warn(`[ttsService] Sarvam TTS error ${res.status}:`, err.slice(0, 120));
      return null;
    }

    const data = await res.json();
    const base64Audio = data.audios?.[0];
    if (!base64Audio) {
      console.warn('[ttsService] Sarvam returned no audio array');
      return null;
    }

    const wavBuffer = Buffer.from(base64Audio, 'base64');
    console.log(`[ttsService] ✅ Sarvam TTS (${config.sarvamSpeaker || 'simran'}) | ${Date.now() - t0}ms | ${wavBuffer.length} bytes`);
    return wavBuffer;
  } catch (err) {
    console.warn('[ttsService] Sarvam exception:', err.message);
    return null;
  }
}

/**
 * Generate natural voice audio.
 * Prioritizes Sarvam AI (Indian conversational voice, <1s latency) if configured.
 * Automatically falls back to Gemini prebuilt voice (Callirrhoe) if needed.
 * @param {string} text - Text to speak
 * @param {string} [voiceName] - Gemini prebuilt voice name (default "Callirrhoe")
 * @returns {Promise<Buffer|null>} - Standard WAV Buffer or null on failure
 */
export async function textToSpeech(text, voiceName = 'Callirrhoe') {
  const cleanText = text
    .replace(/[*_#`~]/g, '')
    .replace(/₹\s*(\d+)/g, '$1 rupaye')
    .replace(/\b(\d+)\s*(?:rs|inr)\b/gi, '$1 rupaye')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return null;

  // 0. Cache check: returns immediately with 0 credit usage if previously spoken!
  const cacheKey = `${config.sarvamSpeaker || 'ishita'}:${cleanText.toLowerCase()}`;
  if (contentCache.has(cacheKey)) {
    console.log(`[ttsService] ⚡ Memory Cache HIT for "${cleanText.slice(0, 30)}..." (0 credits, 0ms!)`);
    return contentCache.get(cacheKey);
  }
  const diskAudio = getDiskCache(cacheKey);
  if (diskAudio) {
    contentCache.set(cacheKey, diskAudio);
    console.log(`[ttsService] ⚡ Disk Cache HIT for "${cleanText.slice(0, 30)}..." (0 credits, 1ms!)`);
    return diskAudio;
  }

  // 1. Try Sarvam AI TTS first if API key is present
  if (config.sarvamApiKey) {
    const sarvamAudio = await generateSarvamTts(cleanText);
    if (sarvamAudio) {
      contentCache.set(cacheKey, sarvamAudio);
      saveDiskCache(cacheKey, sarvamAudio);
      return sarvamAudio;
    }
    console.log('[ttsService] Falling back to Gemini TTS...');
  }

  // 2. Fallback to Gemini TTS (Callirrhoe)
  if (!config.geminiApiKey) {
    console.warn('[ttsService] Neither Sarvam nor Gemini API keys are configured');
    return null;
  }

  const voice = voiceName || config.geminiVoice || 'Callirrhoe';
  const payload = {
    contents: [{ parts: [{ text: cleanText }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  };

  const modelsToTry = [...new Set(TTS_MODELS)];

  for (const ttsModel of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${ttsModel}:generateContent?key=${config.geminiApiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 429 || res.status === 503) {
        const errBody = await res.text().catch(() => '');
        console.warn(`[ttsService] ${ttsModel} quota/overload (${res.status}), trying next model. ${errBody.slice(0, 80)}`);
        continue;
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.error(`[ttsService] ${ttsModel} HTTP error ${res.status}:`, errBody.slice(0, 120));
        return null;
      }

      const data = await res.json();
      const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inlineData?.data) {
        console.warn(`[ttsService] ${ttsModel} returned no audio data`);
        continue;
      }

      console.log(`[ttsService] ✅ Gemini ${ttsModel} | voice: ${voice} | chars: ${cleanText.length}`);
      const pcmBuffer = Buffer.from(inlineData.data, 'base64');
      const wav = pcmToWav(pcmBuffer, 24000, 1, 16);
      contentCache.set(cacheKey, wav);
      saveDiskCache(cacheKey, wav);
      return wav;
    } catch (err) {
      console.error(`[ttsService] ${ttsModel} exception:`, err.message);
      continue;
    }
  }

  console.error('[ttsService] All TTS models exhausted — returning null');
  return null;
}

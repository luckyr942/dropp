// backend/src/aura/sttService.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/config.js';

let geminiClient = null;
function getGemini() {
  if (!geminiClient && config.geminiApiKey) {
    geminiClient = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return geminiClient;
}

/**
 * Primary: Transcribe using Sarvam AI (saarika:v2.5)
 */
async function transcribeWithSarvam(audioBuffer) {
  if (!config.sarvamApiKey) return null;

  const formData = new FormData();
  formData.append(
    'file',
    new Blob([audioBuffer], { type: 'audio/x-m4a' }),
    'speech.m4a'
  );
  formData.append('model', 'saarika:v2.5');
  formData.append('language_code', 'en-IN');

  const response = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: {
      'api-subscription-key': config.sarvamApiKey,
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Sarvam STT status ${response.status}`);
  }

  let transcript = data.transcript?.trim() || null;

  // If Sarvam transcribed into Devanagari Hindi, automatically transliterate to Hinglish (Roman English alphabet)
  if (transcript && /[\u0900-\u097F]/.test(transcript)) {
    try {
      const transRes = await fetch('https://api.sarvam.ai/transliterate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': config.sarvamApiKey,
        },
        body: JSON.stringify({
          input: transcript,
          source_language_code: 'hi-IN',
          target_language_code: 'en-IN',
        }),
      });
      const transData = await transRes.json();
      if (transData.transliterated_text) {
        transcript = transData.transliterated_text.trim();
      }
    } catch (_) {}
  }

  return transcript;
}

/**
 * Fallback: Transcribe using Google Gemini Multimodal Audio
 */
async function transcribeWithGemini(base64Audio) {
  const genAI = getGemini();
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({ model: config.geminiModel || 'gemini-3.5-flash-lite' });
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'audio/mp4',
        data: base64Audio,
      },
    },
    {
      text: 'Transcribe this user audio utterance verbatim in the language spoken (Hindi, Hinglish, or English). Return ONLY the transcription text, with no markdown, labels, or extra words.',
    },
  ]);

  const text = result?.response?.text();
  return text?.trim() || null;
}

/**
 * Unified STT: Tries Sarvam first, then seamlessly falls back to Gemini
 * @param {string} base64Audio - base64 string of recorded audio
 * @returns {Promise<string>}
 */
export async function transcribeAudio(base64Audio) {
  const audioBuffer = Buffer.from(base64Audio, 'base64');

  // 1. Try Sarvam AI first
  try {
    const sarvamResult = await transcribeWithSarvam(audioBuffer);
    if (sarvamResult) {
      console.log('[sttService] ✅ Transcribed via Sarvam AI:', sarvamResult);
      return sarvamResult;
    }
  } catch (sarvamErr) {
    console.warn('[sttService] Sarvam STT failed, trying Gemini fallback:', sarvamErr.message);
  }

  // 2. Fallback to Google Gemini
  try {
    const geminiResult = await transcribeWithGemini(base64Audio);
    if (geminiResult) {
      console.log('[sttService] ✅ Transcribed via Gemini Fallback:', geminiResult);
      return geminiResult;
    }
  } catch (geminiErr) {
    console.error('[sttService] Gemini STT fallback error:', geminiErr.message);
  }

  return '';
}

import { Router } from 'express';
import {
  handleStartSession,
  handleSearchRestaurants,
  handleGetMenu,
  handleBuildDraft,
  handleConfirmOrder,
} from './auraController.js';
import { handleVoiceTurn } from './voiceTurnHandler.js';
import { getAudioBuffer } from './ttsService.js';
import { transcribeAudio } from './sttService.js';

const router = Router();

// Speech to text transcription using Sarvam AI
router.post('/transcribe', async (req, res) => {
  try {
    const { audioBase64 } = req.body ?? {};
    if (!audioBase64) {
      return res.status(400).json({ success: false, error: 'audioBase64 is required' });
    }
    const transcript = await transcribeAudio(audioBase64);
    return res.json({ success: true, transcript });
  } catch (err) {
    console.error('[auraRoutes] Transcribe error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Stream generated Ishita voice audio
router.get('/audio/:id', (req, res) => {
  const buffer = getAudioBuffer(req.params.id);
  if (!buffer) {
    return res.status(404).send('Audio not found or expired');
  }
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.end(buffer);
});

// Session lifecycle: start a new voice conversation
router.post('/session/start', handleStartSession);

// Main Aura Voice / Text Turn endpoint
router.post('/voice-turn', handleVoiceTurn);

// Direct tool endpoints (for testing or external integrations)
router.post('/tools/search-restaurants', handleSearchRestaurants);
router.post('/tools/get-menu', handleGetMenu);
router.post('/tools/build-draft', handleBuildDraft);
router.post('/tools/confirm-order', handleConfirmOrder);

// Voice credit balance endpoint for Aura UI overlay
import { CustomerCredit } from './guardRails.js';
import { config } from '../config/config.js';

router.get('/credits', async (req, res) => {
  try {
    const customerId = req.user?.id ?? config.defaultCustomerId ?? 'guest';
    let user = await CustomerCredit.findOne({ customerId });
    if (!user) {
      user = await CustomerCredit.create({ customerId, credits: 150 });
    } else if (user.credits < 10) {
      // Auto-replenish during development/testing
      user.credits = 150;
      await user.save();
    }
    return res.json({ success: true, credits: user.credits });
  } catch (err) {
    return res.json({ success: true, credits: 150 });
  }
});

export default router;

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

const router = Router();

// Stream generated Callirrhoe voice audio
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

export default router;

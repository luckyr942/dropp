import { Router } from 'express';
import {
  handleStartSession,
  handleSearchRestaurants,
  handleGetMenu,
  handleBuildDraft,
  handleConfirmOrder,
} from './auraController.js';
import { handleVoiceTurn } from './voiceTurnHandler.js';

const router = Router();

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

import { Router } from 'express';
import {
  handleStartSession,
  handleSearchRestaurants,
  handleGetMenu,
  handleBuildDraft,
  handleConfirmOrder,
} from './auraController.js';

const router = Router();

// Session lifecycle: start a new voice conversation
router.post('/session/start', handleStartSession);

// 4 Bolna Voice Tool Endpoints:
router.post('/tools/search-restaurants', handleSearchRestaurants);
router.post('/tools/get-menu', handleGetMenu);
router.post('/tools/build-draft', handleBuildDraft);
router.post('/tools/confirm-order', handleConfirmOrder);

export default router;

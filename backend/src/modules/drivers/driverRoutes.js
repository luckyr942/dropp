// backend/src/modules/drivers/driverRoutes.js

import { Router } from 'express';
import {
  handleRegisterDriver,
  handleSetOnline,
  handleSetOffline,
  handleGetDriver,
  handleAcceptRide,
} from './driverController.js';

const router = Router();

// One-time registration (called from driver app onboarding screen)
router.post('/register', handleRegisterDriver);

// Get driver profile (used to rehydrate app on relaunch)
router.get('/:id', handleGetDriver);

// Toggle availability
router.post('/:id/online', handleSetOnline);
router.post('/:id/offline', handleSetOffline);

// Accept a ride — this replaces hardcoded driver with real driver data
router.post('/:driverId/accept/:rideId', handleAcceptRide);

export default router;

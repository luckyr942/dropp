import { Router } from 'express';
import {
  handleEstimateRide,
  handleBookRide,
  handleGetActiveRide,
  handleCancelRide,
  handleGetLatestDriverOffer,
  handleSimulateDriverOffer,
} from './rideController.js';

const router = Router();

// Driver Live Dispatch & Offer Endpoints
router.get('/driver/latest-offer', handleGetLatestDriverOffer);
router.post('/driver/simulate-offer', handleSimulateDriverOffer);

// Estimate fare & get 10-minute locked quote
router.post('/estimate', handleEstimateRide);

// Book a ride (using locked quoteId or direct pickup/drop)
router.post('/book', handleBookRide);

// Retrieve currently active ride for user
router.get('/active', handleGetActiveRide);

// Cancel an ongoing ride
router.post('/:id/cancel', handleCancelRide);

export default router;

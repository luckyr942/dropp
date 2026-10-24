import { Router } from 'express';
import {
  handleEstimateRide,
  handleBookRide,
  handleGetActiveRide,
  handleCancelRide,
  handleRateRide,
  handleGetLatestDriverOffer,
  handleGetAllPendingOffers,
  handleSimulateDriverOffer,
} from './rideController.js';

const router = Router();

// Driver Live Dispatch & Offer Endpoints
router.get('/driver/latest-offer',    handleGetLatestDriverOffer);   // Driver polls this
router.get('/driver/pending-offers',  handleGetAllPendingOffers);    // All pending offers
router.post('/driver/simulate-offer', handleSimulateDriverOffer);    // Dev/test only

// Rider Booking Flow  - Estimate fare & get 10-minute locked quote
router.post('/estimate', handleEstimateRide);   // Get fare quote
router.post('/book', handleBookRide);         // Confirm booking
router.get('/active', handleGetActiveRide);  // Get current active ride

// Cancel an ongoing ride
router.post('/:id/cancel', handleCancelRide);
router.post('/:id/rate', handleRateRide); 

export default router;

import { Router } from 'express';
import {
    handleRegisterDriver,
    handleListDrivers,
    handleGetNearbyDrivers,
    handleGetDriver,
    handleSetOnline,
    handleSetOffline,
    handleUpdateLocation,
    handleAcceptRide,
} from './driverController.js';

const router = Router();

router.get('/', handleListDrivers);
router.get('/nearby', handleGetNearbyDrivers);
router.post('/register', handleRegisterDriver);

router.get('/:id', handleGetDriver);
router.post('/:id/online', handleSetOnline);
router.post('/:id/offline', handleSetOffline);
router.patch('/:id/location', handleUpdateLocation);

router.post('/:driverId/accept/:rideId', handleAcceptRide);

export default router;

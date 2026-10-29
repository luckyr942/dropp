import { Router } from 'express';
import {
    handleRegisterDriver,
    handleListDrivers,
    handleGetDriver,
    handleUpdateDriverServices,
    handleSetOnline,
    handleSetOffline,
    handleUpdateLocation,
    handleAcceptRide,
    handleUpdateTaskStatus,
} from './driverController.js';

const router = Router();

router.get('/', handleListDrivers);
router.post('/register', handleRegisterDriver);

router.get('/:id', handleGetDriver);
router.patch('/:id/services', handleUpdateDriverServices);
router.post('/:id/online', handleSetOnline);
router.post('/:id/offline', handleSetOffline);
router.patch('/:id/location', handleUpdateLocation);

router.post('/:driverId/accept/:rideId', handleAcceptRide);
router.post('/:driverId/task/:taskId/status', handleUpdateTaskStatus);

export default router;

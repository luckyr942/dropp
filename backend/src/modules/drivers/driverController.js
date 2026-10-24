import mongoose from 'mongoose';
import {
    registerDriver,
    setDriverOnline,
    setDriverOffline,
    getDriverById,
    acceptRide,
    updateDriverLocation,
    getNearbyDrivers,
} from './driverService.js';

// POST /api/drivers/register
export async function handleRegisterDriver(req, res, next) {
    try {
        const { name, phone, vehicleType, vehicleModel, vehicleNumber } = req.body;
        if (!name || !phone || !vehicleType || !vehicleModel || !vehicleNumber) {
            return res.status(400).json({
                success: false,
                error: 'name, phone, vehicleType, vehicleModel, vehicleNumber are all required',
            });
        }
        const driver = await registerDriver({ name, phone, vehicleType, vehicleModel, vehicleNumber });
        return res.status(201).json({ success: true, data: driver });
    } catch (err) {
        next(err);
    }
}

// GET /api/drivers
export async function handleListDrivers(req, res, next) {
    try {
        const { Driver } = await import('./driverModel.js');
        const drivers = await Driver.find().sort({ createdAt: -1 }).limit(50).lean();
        return res.status(200).json({ success: true, data: drivers });
    } catch (err) {
        next(err);
    }
}

// GET /api/drivers/nearby
export async function handleGetNearbyDrivers(req, res, next) {
    try {
        const { lat, lng, radius = 5 } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ success: false, error: 'lat and lng query params required' });
        }
        const drivers = await getNearbyDrivers(Number(lat), Number(lng), Number(radius));
        return res.status(200).json({ success: true, data: drivers });
    } catch (err) {
        next(err);
    }
}

// GET /api/drivers/:id
export async function handleGetDriver(req, res, next) {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid driver ID' });
        }
        const driver = await getDriverById(id);
        if (!driver) return res.status(404).json({ success: false, error: 'Driver not found' });
        return res.status(200).json({ success: true, data: driver });
    } catch (err) {
        next(err);
    }
}

// POST /api/drivers/:id/online
export async function handleSetOnline(req, res, next) {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid driver ID' });
        }
        const driver = await setDriverOnline(id);
        return res.status(200).json({ success: true, data: driver });
    } catch (err) {
        next(err);
    }
}

// POST /api/drivers/:id/offline
export async function handleSetOffline(req, res, next) {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid driver ID' });
        }
        const driver = await setDriverOffline(id);
        return res.status(200).json({ success: true, data: driver });
    } catch (err) {
        next(err);
    }
}

// PATCH /api/drivers/:id/location
export async function handleUpdateLocation(req, res, next) {
    try {
        const { id } = req.params;
        const { lat, lng } = req.body;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid driver ID' });
        }
        if (!lat || !lng) {
            return res.status(400).json({ success: false, error: 'lat and lng required' });
        }
        const driver = await updateDriverLocation(id, Number(lat), Number(lng));
        return res.status(200).json({ success: true, data: driver });
    } catch (err) {
        next(err);
    }
}

// POST /api/drivers/:driverId/accept/:rideId
export async function handleAcceptRide(req, res, next) {
    try {
        const { driverId, rideId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(driverId) || !mongoose.Types.ObjectId.isValid(rideId)) {
            return res.status(400).json({ success: false, error: 'Invalid driverId or rideId' });
        }
        const result = await acceptRide(rideId, driverId);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ success: false, error: err.message });
        next(err);
    }
}

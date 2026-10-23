// backend/src/modules/drivers/driverController.js

import mongoose from 'mongoose';
import {
  registerDriver,
  setDriverOnline,
  setDriverOffline,
  getDriverById,
  acceptRide,
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
    const driver = await setDriverOnline(req.params.id);
    return res.status(200).json({ success: true, data: driver });
  } catch (err) {
    next(err);
  }
}

// POST /api/drivers/:id/offline
export async function handleSetOffline(req, res, next) {
  try {
    const driver = await setDriverOffline(req.params.id);
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
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    next(err);
  }
}

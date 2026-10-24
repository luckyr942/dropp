import mongoose from 'mongoose';
import {
    estimateRide,
    bookRide,
    getActiveRide,
    cancelRide,
    rateRide,
    getLatestDriverOffer,
    setLatestDriverOffer,
    VEHICLE_TIERS,
} from './rideService.js';
import { getLatestOffer, acknowledgeOffer, getAllPending } from '../../infrastructure/offerQueue.js';
import { broadcast } from '../../infrastructure/websocket/wsServer.js';

const ALLOWED_RIDE_TYPES = new Set(VEHICLE_TIERS.map((t) => t.type));

// Helpers 
function validateLocationInput(loc, fieldName) {
    if (!loc) return `${fieldName} location is required.`;

    if (typeof loc === 'string') {
        if (!loc.trim() || loc.trim().length < 2)
            return `${fieldName} must be at least 2 characters long.`;
        if (loc.trim().length > 250)
            return `${fieldName} text is too long (max 250 chars).`;
        return null;
    }

    if (typeof loc === 'object') {
        const lat = Number(loc.lat ?? loc.latitude);
        const lng = Number(loc.lng ?? loc.longitude);
        if (Number.isNaN(lat) || lat < -90 || lat > 90)
            return `${fieldName} latitude must be between -90 and 90.`;
        if (Number.isNaN(lng) || lng < -180 || lng > 180)
            return `${fieldName} longitude must be between -180 and 180.`;
        return null;
    }

    return `${fieldName} must be a location name or coordinates { lat, lng }.`;
}

function resolveCustomerId(req) {
    const rawId =
        req.user?.id ||
        req.headers['x-customer-id'] ||
        req.body?.customerId ||
        req.query?.customerId ||
        'cust_live_001';
    return String(rawId).trim().slice(0, 64);
}

// POST /api/rides/estimate 
export async function handleEstimateRide(req, res, next) {
    try {
        const { pickup, drop } = req.body;

        const pickupErr = validateLocationInput(pickup, 'Pickup');
        if (pickupErr) return res.status(400).json({ success: false, error: pickupErr });

        const dropErr = validateLocationInput(drop, 'Drop');
        if (dropErr) return res.status(400).json({ success: false, error: dropErr });

        if (typeof pickup === 'string' && typeof drop === 'string') {
            if (pickup.trim().toLowerCase() === drop.trim().toLowerCase()) {
                return res.status(400).json({
                    success: false,
                    error: 'Pickup and drop location cannot be the same.',
                });
            }
        }

        const customerId = resolveCustomerId(req);
        const estimate = await estimateRide({ pickup, drop, customerId });
        return res.status(200).json({ success: true, data: estimate });
    } catch (err) {
        if (err.message?.includes('could not resolve') || err.message?.includes('Unable to')) {
            return res.status(400).json({ success: false, error: err.message });
        }
        next(err);
    }
}

// POST /api/rides/book 
export async function handleBookRide(req, res, next) {
    try {
        const { quoteId, rideType = 'cab_economy', pickup, drop } = req.body ?? {};

        if (!ALLOWED_RIDE_TYPES.has(rideType)) {
            return res.status(400).json({
                success: false,
                error: `Invalid rideType "${rideType}". Allowed: ${[...ALLOWED_RIDE_TYPES].join(', ')}`,
            });
        }

        if (quoteId) {
            if (!mongoose.Types.ObjectId.isValid(quoteId)) {
                return res.status(400).json({ success: false, error: 'Invalid quoteId format.' });
            }
        } else {
            const pickupErr = validateLocationInput(pickup, 'Pickup');
            if (pickupErr) return res.status(400).json({ success: false, error: pickupErr });

            const dropErr = validateLocationInput(drop, 'Drop');
            if (dropErr) return res.status(400).json({ success: false, error: dropErr });
        }

        const customerId = resolveCustomerId(req);

        // Cancel any previous active ride for this customer before creating a new one
        const existing = await getActiveRide(customerId);
        if (existing) {
            try {
                await cancelRide(existing._id, customerId);
                console.log(`[handleBookRide] Cleared previous ride ${existing._id}`);
            } catch (_) {}
        }

        const ride = await bookRide({ customerId, quoteId, rideType, pickup, drop });
        return res.status(201).json({ success: true, data: ride });
    } catch (err) {
        if (err.message?.includes('expired') || err.message?.includes('invalid')) {
            return res.status(410).json({ success: false, error: err.message });
        }
        next(err);
    }
}

// GET /api/rides/active 
export async function handleGetActiveRide(req, res, next) {
    try {
        const customerId = resolveCustomerId(req);
        const activeRide = await getActiveRide(customerId);
        return res.status(200).json({ success: true, data: activeRide || null });
    } catch (err) {
        next(err);
    }
}

// POST /api/rides/:id/cancel 
export async function handleCancelRide(req, res, next) {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid ride ID format.' });
        }
        const customerId = resolveCustomerId(req);
        const cancelled = await cancelRide(id, customerId);
        return res.status(200).json({ success: true, data: cancelled });
    } catch (err) {
        if (err.message?.includes('not found') || err.message?.includes('already completed')) {
            return res.status(404).json({ success: false, error: err.message });
        }
        next(err);
    }
}

// POST /api/rides/:id/rate 
export async function handleRateRide(req, res, next) {
    try {
        const { id } = req.params;
        const { rating } = req.body;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid ride ID.' });
        }
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, error: 'Rating must be 1 to 5.' });
        }
        const customerId = resolveCustomerId(req);
        const ride = await rateRide(id, customerId, Number(rating));
        return res.status(200).json({ success: true, data: ride });
    } catch (err) {
        next(err);
    }
}

// GET /api/rides/driver/latest-offer 
// Driver app polls this every 1.5s. Returns newest pending offer from queue.
export async function handleGetLatestDriverOffer(req, res, next) {
    try {
        // Queue-based (supports multiple simultaneous rides)
        const offer = getLatestOffer() || getLatestDriverOffer();
        return res.status(200).json({ success: true, data: offer });
    } catch (err) {
        next(err);
    }
}

// GET /api/rides/driver/pending-offers 
// Returns ALL pending offers so a driver dashboard can show a list.
export async function handleGetAllPendingOffers(req, res, next) {
    try {
        const offers = getAllPending();
        return res.status(200).json({ success: true, data: offers, count: offers.length });
    } catch (err) {
        next(err);
    }
}

//  POST /api/rides/driver/simulate-offer 
// Test endpoint — creates a fake offer for driver app testing without a rider booking.
export async function handleSimulateDriverOffer(req, res, next) {
    try {
        const {
            serviceType = 'RIDE',
            fare = '₹361',
            pickup = 'Sector 1, Bokaro',
            destination = 'Balidih Main Gate',
        } = req.body || {};

        const { pushOffer } = await import('../../infrastructure/offerQueue.js');

        const offer = {
            offerId: 'sim_' + Date.now(),
            serviceType,
            title: `NEW ${serviceType.toUpperCase()} REQUEST`,
            fare,
            fareNumber: parseInt(fare.replace(/[^0-9]/g, '')) || 361,
            distance: '15.97 km • 29 mins',
            pickup,
            destination,
            otp: String(Math.floor(1000 + Math.random() * 9000)),
            vehicleTier: 'cab_economy',
            customerName: 'Test Customer',
            customerRating: '4.8 ★',
            createdAt: new Date().toISOString(),
        };

        pushOffer(offer);
        setLatestDriverOffer(offer);
        broadcast('driver.incoming_offer', offer);

        return res.status(200).json({
            success: true,
            message: 'Simulated offer pushed to queue and broadcast to all drivers',
            data: offer,
        });
    } catch (err) {
        next(err);
    }
}

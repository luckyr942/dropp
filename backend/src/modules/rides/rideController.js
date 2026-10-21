import mongoose from 'mongoose';
import { estimateRide, bookRide, getActiveRide, cancelRide, VEHICLE_TIERS } from './rideService.js';

const ALLOWED_RIDE_TYPES = new Set(VEHICLE_TIERS.map((t) => t.type ));

function validateLocationInput(loc, fieldName){
    if(!loc){
        return `${fieldName} location is required.`;
    }

    if(typeof loc === 'string'){
        if(!loc.trim() || loc.trim().length < 2){
            return `${fieldName} must be at least 2 characters long.`;
        }
        if (loc.trim().length > 250) {
            return `${fieldName} text is too long (max 250 chars).`;
        }
        return null;
    }

    if (typeof loc === 'object') {
        const lat = Number(loc.lat ?? loc.latitude);
        const lng = Number(loc.lng ?? loc.longitude);
        if (Number.isNaN(lat) || lat < -90 || lat > 90) {
            return `${fieldName} latitude must be a valid number between -90 and 90.`;
        }
        if (Number.isNaN(lng) || lng < -180 || lng > 180) {
            return `${fieldName} longitude must be a valid number between -180 and 180.`;
        }
        return null;
    }
    return `${fieldName} must be a location name or coordinates object { lat, lng }.`;
}

//This function resolveCustomerId(req) tries to figure out which customer is making an API request in your Dropp backend.
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
export async function handleEstimateRide(req, res, next){
    try{
        const {pickup, drop} = req.body;
        
        //validate pickup
        const pickupErr = validateLocationInput(pickup, 'Pickup');
        if(pickupErr){
            return res.status(400).json({ success: false, error: pickupErr });
        }

        //validate drop
        const droppErr = validateLocationInput(drop, 'Drop');
        if(droppErr){
            return res.status(400).json({success: false, error: droppErr });
        }

        //prevent identical pickup & dropp
        if(typeof pickup === 'string' && typeof drop === 'string'){
            if(pickup.trim().toLowerCase() === drop.trim().toLowerCase()){
                return res.status(400).json({
                    success: false,
                    error: 'Pickup and drop location cannot be same/identical'
                });
            }
        }

        const customerId = resolveCustomerId(req);

        const estimate = await estimateRide({
            pickup,
            drop,
            customerId,
        });

        return res.status(200).json({
            success: true,
            data: estimate,
        });
    }catch(err){
        if(err.message?.includes('could not resolve') || err.message?.includes('Unable to calulcate route')){
            return res.status(400).json({
                success: false,
                error: err.message,
            });
        }
        next(err);
    }
}


// POST /api/rides/book -> confirms the ride booking
export async function handleBookRide(req, res, next){

    try{
        const { quoteId, rideType = 'cab_economy', pickup, drop } = req.body ?? {};

        //validate ride tier
        if (!ALLOWED_RIDE_TYPES.has(rideType)) {
            return res.status(400).json({
                success: false,
                error: `Invalid rideType "${rideType}". Allowed types: ${Array.from(ALLOWED_RIDE_TYPES).join(', ')}`,
            });
        }

        //Validate booking inputs (either valid quoteId or pickup+drop required)
        if (quoteId) {
            if (!mongoose.Types.ObjectId.isValid(quoteId)) {
                return res.status(400).json({
                success: false,
                error: 'Invalid quoteId format.',
                });
            }
        } else {
            const pickupErr = validateLocationInput(pickup, 'Pickup');
            if (pickupErr) return res.status(400).json({ success: false, error: pickupErr });

            const dropErr = validateLocationInput(drop, 'Drop');
            if (dropErr) return res.status(400).json({ success: false, error: dropErr });
        }

        const customerId = resolveCustomerId(req);

        //3. Check if user already has an ongoing active ride
        const existingRide = await getActiveRide(customerId);
        if (existingRide) {
            return res.status(409).json({
                success: false,
                error: 'You already have an active ride in progress. Complete or cancel it before booking a new one.',
                data: { activeRideId: existingRide._id, status: existingRide.status },
            });
        }
        const ride = await bookRide({
            customerId,
            quoteId,
            rideType,
            pickup,
            drop,
        });
        return res.status(201).json({
            success: true,
            data: ride,
        });

    } catch (err) {
        if (err.message?.includes('expired') || err.message?.includes('invalid')) {
            return res.status(410).json({
                success: false,
                error: err.message,
            });
        }
        next(err);
    }
}

// GET /api/rides/active --> fetches the customer's current active ride (searching, assigned, arrived, in_progress).
export async function handleGetActiveRide(req, res, next){
    try {
        const customerId = resolveCustomerId(req);
        const activeRide = await getActiveRide(customerId);
        return res.status(200).json({
            success: true,
            data: activeRide || null,
        });
    } catch (err) {
        next(err);
    }
}


// POST /api/rides/:id/cancel -> Cancels an ongoing ride with safety validation.
export async function handleCancelRide(req, res, next) {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid ride ID format.',
            });
        }
        const customerId = resolveCustomerId(req);
        const cancelledRide = await cancelRide(id, customerId);
        return res.status(200).json({
            success: true,
            data: cancelledRide,
        });
    } catch (err) {
        if (err.message?.includes('not found') || err.message?.includes('already completed')) {
            return res.status(404).json({
                success: false,
                error: err.message,
            });
        }
        next(err);
    }
}

// GET /api/rides/driver/latest-offer
export async function handleGetLatestDriverOffer(req, res, next) {
    try {
        const { getLatestDriverOffer } = await import('./rideService.js');
        const offer = getLatestDriverOffer();
        return res.status(200).json({
            success: true,
            data: offer,
        });
    } catch (err) {
        next(err);
    }
}

// POST /api/rides/driver/simulate-offer
export async function handleSimulateDriverOffer(req, res, next) {
    try {
        const { serviceType = 'RIDE', fare = '₹361', pickup = 'Sector 1, Bokaro', destination = 'Balidih Main Gate' } = req.body || {};
        const { setLatestDriverOffer } = await import('./rideService.js');
        const { broadcast } = await import('../../infrastructure/websocket/wsServer.js');

        const offer = {
            offerId: 'offer_sim_' + Date.now(),
            serviceType,
            title: `NEW ${serviceType.toUpperCase()} REQUEST`,
            fare,
            distance: '15.97 km • 29 mins',
            pickup,
            destination,
            otp: '4821',
            customerName: 'Rahul Verma',
            customerRating: '4.9 ★',
            createdAt: new Date().toISOString(),
        };

        setLatestDriverOffer(offer);
        broadcast('driver.incoming_offer', offer);

        return res.status(200).json({
            success: true,
            message: 'Simulated offer broadcasted to all drivers',
            data: offer,
        });
    } catch (err) {
        next(err);
    }
}



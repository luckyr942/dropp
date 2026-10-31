import mongoose from 'mongoose';
import { Ride, RideQuote } from './rideModel.js';
import { getRoute } from './routeService.js';
import { broadcast, emitToCustomer } from '../../infrastructure/websocket/wsServer.js';
import { pushOffer, acknowledgeOffer } from '../../infrastructure/offerQueue.js';

// Priced ~10% under the Uber / Ola / Rapido rate-card estimates in rideCompareService.js,
// so Dropp is the cheapest option Aura can book in every category.
export const VEHICLE_TIERS = [
    {
        type: 'bike',
        name: 'Dropp Bike',
        baseFare: 15,
        perKmRate: 5,
        perMinuteRate: 0.5,
        minimumFare: 25,
        etaMins: 3,
        icon: 'bicycle',
    },
    {
        type: 'auto',
        name: 'Dropp Auto',
        baseFare: 25,
        perKmRate: 10,
        perMinuteRate: 0.5,
        minimumFare: 30,
        etaMins: 4,
        icon: 'car',
    },
    {
        type: 'cab_economy',
        name: 'Dropp Go',
        baseFare: 40,
        perKmRate: 12,
        perMinuteRate: 0.75,
        minimumFare: 70,
        etaMins: 5,
        icon: 'car-sport',
    },
    {
        type: 'cab_premium',
        name: 'Dropp Premier',
        baseFare: 70,
        perKmRate: 16,
        perMinuteRate: 1.25,
        minimumFare: 110,
        etaMins: 6,
        icon: 'car-sport',
    },
];

const FALLBACK_DRIVERS = [
    { name: 'Vikram Singh',  phone: '+91 98112 34567', vehicleModel: 'Swift Dzire',    vehicleNumber: 'DL 1Z A 4421',  rating: 4.89, avatar: null, etaMinutes: 4 },
    { name: 'Rajesh Sharma', phone: '+91 99234 56789', vehicleModel: 'Bajaj Auto',     vehicleNumber: 'HR 26 AT 8812', rating: 4.75, avatar: null, etaMinutes: 5 },
    { name: 'Mohit Verma',   phone: '+91 97123 45678', vehicleModel: 'Honda Activa',   vehicleNumber: 'DL 4S B 1092',  rating: 4.92, avatar: null, etaMinutes: 3 },
    { name: 'Arjun Nair',    phone: '+91 96321 78900', vehicleModel: 'Maruti Ertiga',  vehicleNumber: 'KA 05 MX 7741', rating: 4.81, avatar: null, etaMinutes: 6 },
    { name: 'Suresh Pillai', phone: '+91 98765 12300', vehicleModel: 'TVS Jupiter',    vehicleNumber: 'TN 09 BZ 3321', rating: 4.67, avatar: null, etaMinutes: 4 },
    { name: 'Deepak Yadav',  phone: '+91 97890 45612', vehicleModel: 'Hyundai i10',    vehicleNumber: 'UP 14 CK 9901', rating: 4.88, avatar: null, etaMinutes: 5 },
    { name: 'Rahul Gupta',   phone: '+91 99001 23344', vehicleModel: 'Wagon R CNG',    vehicleNumber: 'DL 01 CC 5510', rating: 4.79, avatar: null, etaMinutes: 4 },
    { name: 'Sanjay Mishra', phone: '+91 95555 67890', vehicleModel: 'Tata Indica',    vehicleNumber: 'RJ 14 GA 4410', rating: 4.72, avatar: null, etaMinutes: 7 },
    { name: 'Anil Kumar',    phone: '+91 98444 11234', vehicleModel: 'Mahindra eVerito', vehicleNumber: 'DL 7CF AB 2231', rating: 4.95, avatar: null, etaMinutes: 3 },
    { name: 'Manoj Tiwari',  phone: '+91 91234 56789', vehicleModel: 'Toyota Innova',  vehicleNumber: 'UP 32 CT 8812', rating: 4.86, avatar: null, etaMinutes: 8 },
    { name: 'Pradeep Bose',  phone: '+91 90012 34567', vehicleModel: 'Bajaj Pulsar',   vehicleNumber: 'WB 29 AB 6634', rating: 4.70, avatar: null, etaMinutes: 4 },
    { name: 'Kiran Reddy',   phone: '+91 92222 88811', vehicleModel: 'Honda City',     vehicleNumber: 'TS 08 EZ 4411', rating: 4.91, avatar: null, etaMinutes: 5 },
];

export function calculateFares({ distanceKm, durationMins }) {
    const dist = Math.max(0.5, Number(distanceKm) || 1.0);
    const dur = Math.max(1, Number(durationMins) || 5);
    return VEHICLE_TIERS.map((tier) => {
        const rawFare = tier.baseFare + dist * tier.perKmRate + dur * tier.perMinuteRate;
        const finalFare = Math.max(tier.minimumFare, Math.ceil(rawFare));
        return {
            type: tier.type,
            name: tier.name,
            fare: finalFare,
            etaMins: tier.etaMins,
            icon: tier.icon,
        };
    });
}

export async function estimateRide({ pickup, drop, customerId = 'cust_live_001' }) {
    const route = await getRoute(pickup, drop);
    const fares = calculateFares({
        distanceKm: route.distanceKm,
        durationMins: route.durationMins,
    });

    let quoteId = `q_${Date.now()}`;
    try {
        if (mongoose.connection?.readyState === 1) {
            const quote = await RideQuote.create({
                customerId,
                pickup: route.pickup,
                drop: route.drop,
                distanceKm: route.distanceKm,
                durationMins: route.durationMins,
                geometry: route.geometry,
                fares,
            });
            quoteId = quote._id;
        }
    } catch (err) {
        console.warn('[estimateRide] Could not persist quote:', err.message);
    }

    return {
        quoteId,
        pickup: route.pickup,
        drop: route.drop,
        distanceKm: route.distanceKm,
        durationMins: route.durationMins,
        geometry: route.geometry,
        fares,
        expiresInSeconds: 600,
    };
}

// ── Demo safety net ─────────────────────────────────────────────────────────
// A booked ride waits for a real driver to accept from the driver app. If nobody accepts within
// AUTO_ASSIGN_DRIVER_MS (default 40s — after the driver app's 30s accept window; 0 disables), a fallback driver is assigned and the trip is
// simulated end to end — including live location updates — so a solo demo never stalls.
const AUTO_ASSIGN_MS = Number(process.env.AUTO_ASSIGN_DRIVER_MS ?? 40000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function bearingBetween(a, b) {
    const toRad = (d) => (d * Math.PI) / 180;
    const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
    const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
        Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Spread `steps` points evenly along a list of {lat,lng}
function samplePath(points, steps) {
    if (points.length < 2) return points;
    const out = [];
    for (let i = 0; i < steps; i++) {
        const t = (i / (steps - 1)) * (points.length - 1);
        const k = Math.min(Math.floor(t), points.length - 2);
        const f = t - k;
        out.push({
            lat: points[k].lat + (points[k + 1].lat - points[k].lat) * f,
            lng: points[k].lng + (points[k + 1].lng - points[k].lng) * f,
        });
    }
    return out;
}

async function driveAlong(driverId, path, durationMs) {
    const steps = samplePath(path, Math.max(2, Math.round(durationMs / 1000)));
    for (let i = 0; i < steps.length; i++) {
        const next = steps[i + 1] || steps[i];
        broadcast('driver.location_update', {
            driverId,
            lat: steps[i].lat,
            lng: steps[i].lng,
            bearing: bearingBetween(steps[i], next),
            simulated: true,
        });
        await sleep(1000);
    }
}

async function setRideStatus(rideId, from, to) {
    return Ride.findOneAndUpdate({ _id: rideId, status: { $in: from } }, { $set: { status: to } }, { new: true });
}

function emitRideEvent(ride, eventType, extra = {}) {
    const payload = { rideId: ride._id, customerId: ride.customerId, status: ride.status, serviceType: ride.serviceType || 'RIDE', ...extra };
    emitToCustomer(ride.customerId, eventType, payload);
    broadcast(eventType, payload);
}

function scheduleAutoAssign(rideId) {
    if (!AUTO_ASSIGN_MS) return;
    setTimeout(() => {
        autoAssignAndSimulate(rideId).catch((err) => console.error('[autoAssign] failed:', err.message));
    }, AUTO_ASSIGN_MS);
}

async function autoAssignAndSimulate(rideId) {
    const pick = FALLBACK_DRIVERS[Math.floor(Math.random() * FALLBACK_DRIVERS.length)];
    const driver = {
        driverId: `sim_${pick.vehicleNumber.replace(/\s+/g, '')}`,
        name: pick.name,
        phone: pick.phone,
        vehicle: `${pick.vehicleModel} • ${pick.vehicleNumber}`,
        rating: pick.rating,
        avatar: null,
        etaMinutes: pick.etaMinutes,
    };
    // Only claims the ride if no real driver accepted it in the meantime
    const ride = await Ride.findOneAndUpdate(
        { _id: rideId, status: 'searching' },
        { $set: { status: 'driver_assigned', driver } },
        { new: true }
    ).select('+otp');
    if (!ride) return;

    acknowledgeOffer(rideId.toString());
    broadcast('driver.offer_taken', { offerId: rideId.toString() });
    console.log(`[autoAssign] No driver accepted ride ${rideId}; assigned demo driver ${driver.name}`);
    emitRideEvent(ride, 'ride.driver_confirmed', {
        driver,
        otp: ride.otp,
        message: `${driver.name} is on the way`,
    });

    const pickup = { lat: ride.pickupLocation.lat, lng: ride.pickupLocation.lng };
    const routePts = (ride.routeGeometry?.coordinates || []).map(([lng, lat]) => ({ lat, lng }));
    const tripPath = routePts.length > 1 ? routePts : [pickup, { lat: ride.dropLocation.lat, lng: ride.dropLocation.lng }];
    // Approach from ~1 km away, then drive the real route
    const start = { lat: pickup.lat + 0.008, lng: pickup.lng - 0.006 };

    await driveAlong(driver.driverId, [start, pickup], 8000);
    let r = await setRideStatus(rideId, ['driver_assigned'], 'arrived');
    if (!r) return;
    emitRideEvent(r, 'ride.driver_arrived', { message: 'Your driver has arrived at the pickup point.' });

    await sleep(4000);
    r = await setRideStatus(rideId, ['arrived'], 'in_progress');
    if (!r) return;
    emitRideEvent(r, 'ride.trip_started', { message: 'Your trip has started. Enjoy the ride!' });

    await driveAlong(driver.driverId, tripPath, 30000);
    r = await setRideStatus(rideId, ['in_progress'], 'completed');
    if (!r) return;
    emitRideEvent(r, 'ride.completed', { fare: r.fare, message: 'You have reached your destination.' });
}

// Timers live in memory, so a restart (node --watch reloads on every save) would strand rides in
// "searching". On boot, re-arm recent ones and cancel anything too old to still be wanted.
export async function resumeSearchingRides() {
    if (mongoose.connection?.readyState !== 1) return;
    const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
    const stale = await Ride.updateMany({ status: 'searching', createdAt: { $lt: staleBefore } }, { $set: { status: 'cancelled' } });
    const pending = await Ride.find({ status: 'searching', createdAt: { $gte: staleBefore } }).select('_id').lean();
    pending.forEach((r) => scheduleAutoAssign(r._id));
    if (stale.modifiedCount || pending.length) {
        console.log(`[rides] Resumed ${pending.length} searching ride(s), cancelled ${stale.modifiedCount} stale one(s)`);
    }
}

export async function bookRide({
    customerId = 'cust_live_001',
    quoteId = null,
    rideType = 'cab_economy',
    pickup,
    drop,
    serviceType = 'RIDE',
    packageDetails = null,
}) {
    let quote = quoteId ? await RideQuote.findById(quoteId) : null;
    if (quoteId && !quote) {
        throw new Error('Fare quote has expired or is invalid. Please get a new estimate.');
    }
    if (!quote) {
        quote = await estimateRide({ pickup, drop, customerId });
    }
    const selectedFare = quote.fares.find((f) => f.type === rideType) || quote.fares[2];
    const pickupLoc = quote.pickup;
    const dropLoc = quote.drop;

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const ride = await Ride.create({
        customerId,
        pickupLocation: pickupLoc,
        dropLocation: dropLoc,
        rideType,
        serviceType: serviceType || 'RIDE',
        packageDetails,
        fare: selectedFare.fare,
        distanceKm: quote.distanceKm,
        estimatedMins: quote.durationMins,
        routeGeometry: quote.geometry,
        otp,
        status: 'searching',
        quoteId: quoteId || null,
    });

    const isDelivery = serviceType === 'DELIVERY' || serviceType === 'PARCEL DELIVERY';
    const offerData = {
        offerId: ride._id.toString(),
        serviceType: isDelivery ? 'PARCEL DELIVERY' : 'RIDE',
        title: isDelivery ? 'NEW PARCEL PICKUP REQUEST' : `NEW ${String(rideType).toUpperCase().replace('_', ' ')} REQUEST`,
        fare: `₹${selectedFare.fare}`,
        fareNumber: selectedFare.fare,
        distance: `${Number(quote.distanceKm).toFixed(1)} km • ${Math.round(quote.durationMins)} mins`,
        pickup: pickupLoc,
        destination: dropLoc,
        routeGeometry: quote.geometry,
        packageDetails,
        vehicleTier: rideType,
        createdAt: new Date().toISOString(),
    };

    pushOffer(offerData);
    broadcast('driver.incoming_offer', offerData);

    const searchingPayload = { rideId: ride._id, customerId, status: 'searching', fare: selectedFare.fare };
    emitToCustomer(customerId, 'ride.searching', searchingPayload);
    broadcast('ride.searching', searchingPayload);

    scheduleAutoAssign(ride._id);

    console.log(`[bookRide] Ride ${ride._id} searching for a driver. Fare: ₹${selectedFare.fare}`);
    // The customer needs their OTP to share with the driver at pickup
    return { ...ride.toObject(), otp };
}

let latestDriverOffer = null;

export function setLatestDriverOffer(offer) {
    latestDriverOffer = offer;
}

export function getLatestDriverOffer() {
    return latestDriverOffer;
}

export async function getRideById(rideId) {
    return Ride.findById(rideId).select('+otp').lean();
}

export async function getActiveRide(customerId = 'cust_live_001') {
    return Ride.findOne({
        customerId,
        status: { $in: ['searching', 'driver_assigned', 'arrived', 'in_progress'] },
    })
        .select('+otp')
        .sort({ createdAt: -1 })
        .lean();
}

export async function cancelRide(rideId, customerId = 'cust_live_001') {
    const ride = await Ride.findOneAndUpdate(
        { _id: rideId, customerId, status: { $nin: ['completed', 'cancelled'] } },
        { $set: { status: 'cancelled' } },
        { new: true }
    );
    if (!ride) throw new Error('Active ride not found or already completed');

    // Pull the offer from every driver app and tell an assigned driver the trip is off
    acknowledgeOffer(ride._id.toString());
    broadcast('driver.offer_taken', { offerId: ride._id.toString() });
    emitRideEvent(ride, 'ride.cancelled', { driverId: ride.driver?.driverId || null, message: 'The customer cancelled this ride.' });

    if (ride.driver?.driverId) {
        try {
            const { Driver } = await import('../drivers/driverModel.js');
            await Driver.findByIdAndUpdate(ride.driver.driverId, {
                $set: { isOnline: true, isBusy: false, activeTaskId: null },
            });
        } catch (_) {}
    }

    return ride.toObject();
}

export async function rateRide(rideId, customerId, rating) {
    if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');
    const ride = await Ride.findOne({ _id: rideId, customerId, status: 'completed' });
    if (!ride) throw new Error('Completed ride not found');

    ride.customerRating = rating;
    await ride.save();

    if (ride.driver?.driverId) {
        try {
            const { Driver } = await import('../drivers/driverModel.js');
            const driver = await Driver.findById(ride.driver.driverId);
            if (driver) {
                const newRating = (driver.rating * driver.totalTrips + rating) / (driver.totalTrips + 1);
                await Driver.findByIdAndUpdate(ride.driver.driverId, {
                    $set: { rating: Math.round(newRating * 100) / 100 },
                    $inc: { totalTrips: 1 },
                });
            }
        } catch (_) {}
    }

    return ride.toObject();
}
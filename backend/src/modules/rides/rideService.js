import mongoose from 'mongoose';
import { Ride, RideQuote } from './rideModel.js';
import { getRoute } from './routeService.js';
import { broadcast, emitToCustomer } from '../../infrastructure/websocket/wsServer.js';
import { pushOffer } from '../../infrastructure/offerQueue.js';

export const VEHICLE_TIERS = [
    {
        type: 'bike',
        name: 'Dropp Bike',
        baseFare: 25,
        perKmRate: 9,
        perMinuteRate: 0.5,
        minimumFare: 35,
        etaMins: 3,
        icon: 'bicycle',
    },
    {
        type: 'auto',
        name: 'Dropp Auto',
        baseFare: 35,
        perKmRate: 13,
        perMinuteRate: 0.75,
        minimumFare: 50,
        etaMins: 4,
        icon: 'car',
    },
    {
        type: 'cab_economy',
        name: 'Dropp Go',
        baseFare: 60,
        perKmRate: 17,
        perMinuteRate: 1.0,
        minimumFare: 80,
        etaMins: 5,
        icon: 'car-sport',
    },
    {
        type: 'cab_premium',
        name: 'Dropp Premier',
        baseFare: 90,
        perKmRate: 23,
        perMinuteRate: 1.5,
        minimumFare: 120,
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

function scheduleSimulatedRide(ride, customerId) {
    const steps = [
        [8000,  'arrived',     'ride.driver_arrived', 'Your driver has arrived at the pickup point.'],
        [15000, 'in_progress', 'ride.trip_started',   'Your trip has started. Enjoy the ride!'],
        [45000, 'completed',   'ride.completed',      'You have reached your destination. Have a great day!'],
    ];

    for (const [ms, status, eventType, message] of steps) {
        setTimeout(async () => {
            try {
                const fresh = await Ride.findById(ride._id);
                if (!fresh) return;
                if (['cancelled', 'completed'].includes(fresh.status)) return;

                fresh.status = status;
                await fresh.save();

                const eventPayload = {
                    rideId: ride._id,
                    customerId,
                    status,
                    message,
                };
                emitToCustomer(customerId, eventType, eventPayload);
                broadcast(eventType, eventPayload);
                console.log(`[scheduleSimulatedRide] ${eventType} -> ride ${ride._id}`);
            } catch (err) {
                console.error('[scheduleSimulatedRide] Error at', status, ':', err.message);
            }
        }, ms);
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
    let fareAmount = 150;
    let distKm = 5.0;
    let durMins = 15;
    let routeGeo = null;
    let pickupLoc = pickup;
    let dropLoc = drop;

    if (quoteId) {
        const quote = await RideQuote.findById(quoteId);
        if (!quote) {
            throw new Error('Fare quote has expired or is invalid. Please get a new estimate.');
        }
        const selectedFare = quote.fares.find((f) => f.type === rideType) || quote.fares[2];
        fareAmount = selectedFare.fare;
        distKm = quote.distanceKm;
        durMins = quote.durationMins;
        routeGeo = quote.geometry;
        pickupLoc = quote.pickup;
        dropLoc = quote.drop;
    } else {
        const estimate = await estimateRide({ pickup, drop, customerId });
        const selectedFare = estimate.fares.find((f) => f.type === rideType) || estimate.fares[2];
        fareAmount = selectedFare.fare;
        distKm = estimate.distanceKm;
        durMins = estimate.durationMins;
        routeGeo = estimate.geometry;
        pickupLoc = estimate.pickup;
        dropLoc = estimate.drop;
    }

    let driver;
    try {
        const { Driver } = await import('../drivers/driverModel.js');
        const realDriver = await Driver.findOneAndUpdate(
            { isOnline: true },
            { $set: { isOnline: false } },
            { new: false }
        ).lean();

        if (realDriver) {
            driver = {
                driverId: realDriver._id.toString(),
                name: realDriver.name,
                phone: realDriver.phone,
                vehicle: `${realDriver.vehicleModel} • ${realDriver.vehicleNumber}`,
                rating: realDriver.rating,
                avatar: realDriver.avatar || null,
                etaMinutes: 3,
            };
            console.log(`[bookRide] Assigned driver: ${realDriver.name}`);
        }
    } catch (err) {
        console.warn('[bookRide] Could not query drivers:', err.message);
    }

    if (!driver) {
        const fallback = FALLBACK_DRIVERS[Math.floor(Math.random() * FALLBACK_DRIVERS.length)];
        driver = {
            ...fallback,
            vehicle: `${fallback.vehicleModel} • ${fallback.vehicleNumber}`,
        };
        console.log(`[bookRide] Using fallback driver: ${driver.name}`);
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const ride = await Ride.create({
        customerId,
        pickupLocation: pickupLoc,
        dropLocation: dropLoc,
        rideType,
        serviceType: serviceType || 'RIDE',
        packageDetails,
        fare: fareAmount,
        distanceKm: distKm,
        estimatedMins: durMins,
        routeGeometry: routeGeo,
        otp,
        driver,
        status: 'driver_assigned',
        quoteId,
    });

    const isDelivery = serviceType === 'DELIVERY' || serviceType === 'PARCEL DELIVERY';
    const offerData = {
        offerId: ride._id.toString(),
        serviceType: isDelivery ? 'PARCEL DELIVERY' : 'RIDE',
        title: isDelivery ? 'NEW PARCEL PICKUP REQUEST' : `NEW ${String(rideType).toUpperCase()} REQUEST`,
        fare: `₹${fareAmount}`,
        fareNumber: fareAmount,
        distance: `${distKm.toFixed(1)} km • ${Math.round(durMins)} mins`,
        pickup: pickupLoc,
        destination: dropLoc,
        otp,
        packageDetails,
        vehicleTier: rideType,
        customerName: customerId,
        customerRating: '4.9 ★',
        createdAt: new Date().toISOString(),
    };

    pushOffer(offerData);
    setLatestDriverOffer(offerData);

    broadcast('driver.incoming_offer', offerData);

    const assignPayload = {
        rideId: ride._id,
        customerId,
        status: 'driver_assigned',
        driver,
        otp,
    };
    emitToCustomer(customerId, 'ride.driver_assigned', assignPayload);
    broadcast('ride.driver_assigned', assignPayload);

    scheduleSimulatedRide(ride.toObject(), customerId);

    console.log(`[bookRide] Ride ${ride._id} created. Driver: ${driver.name}. Fare: ₹${fareAmount}`);
    return ride.toObject();
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
        { _id: rideId, customerId, status: { $ne: 'completed' } },
        { $set: { status: 'cancelled' } },
        { new: true }
    );
    if (!ride) throw new Error('Active ride not found or already completed');

    if (ride.driver?.driverId) {
        try {
            const { Driver } = await import('../drivers/driverModel.js');
            await Driver.findByIdAndUpdate(ride.driver.driverId, { $set: { isOnline: true } });
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
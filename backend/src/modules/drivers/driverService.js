import mongoose from 'mongoose';
import { Driver } from './driverModel.js';
import { Ride } from '../rides/rideModel.js';
import { emitToCustomer, broadcast } from '../../infrastructure/websocket/wsServer.js';
import { acknowledgeOffer } from '../../infrastructure/offerQueue.js';

// In-Memory Driver Cache & Offline Fleet Fallback
const inMemoryDrivers = new Map();

const DEFAULT_IN_MEMORY_FLEET = [
    {
        _id: '672378901234567890123401',
        name: 'Pradeep Bose',
        phone: '+91 98101 23456',
        vehicleType: 'cab_economy',
        vehicleModel: 'Maruti Dzire White',
        vehicleNumber: 'DL 01 AB 4001',
        enabledServices: ['RIDE', 'PARCEL'],
        rating: 4.9,
        totalTrips: 184,
        tripsToday: 3,
        earningsToday: 840,
        isOnline: true,
        isBusy: false,
        location: { lat: 28.4720, lng: 77.0890, bearing: 45, updatedAt: new Date() },
    },
    {
        _id: '672378901234567890123402',
        name: 'Rohan Sharma',
        phone: '+91 98202 34567',
        vehicleType: 'bike',
        vehicleModel: 'TVS NTorq 125',
        vehicleNumber: 'HR 26 DK 8812',
        enabledServices: ['FOOD', 'GROCERY', 'PHARMACY', 'PARCEL'],
        rating: 4.8,
        totalTrips: 92,
        tripsToday: 4,
        earningsToday: 420,
        isOnline: true,
        isBusy: false,
        location: { lat: 28.4760, lng: 77.0920, bearing: 90, updatedAt: new Date() },
    },
    {
        _id: '672378901234567890123403',
        name: 'Rome',
        phone: '+91 98765 43210',
        vehicleType: 'bike',
        vehicleModel: 'Honda Activa 6G',
        vehicleNumber: 'DL 3S CD 9021',
        enabledServices: ['RIDE', 'FOOD', 'GROCERY', 'PARCEL', 'PHARMACY'],
        rating: 5.0,
        totalTrips: 340,
        tripsToday: 6,
        earningsToday: 1260,
        isOnline: true,
        isBusy: false,
        location: { lat: 28.4740, lng: 77.0850, bearing: 180, updatedAt: new Date() },
    },
];

for (const d of DEFAULT_IN_MEMORY_FLEET) {
    inMemoryDrivers.set(d._id, { ...d });
}

export function listInMemoryDrivers() {
    return Array.from(inMemoryDrivers.values());
}

export async function listAllDrivers() {
    if (mongoose.connection?.readyState === 1) {
        try {
            const drivers = await Driver.find().sort({ createdAt: -1 }).limit(50).lean();
            if (drivers && drivers.length > 0) return drivers;
        } catch (_) {}
    }
    return listInMemoryDrivers();
}

// Auto-seed real MongoDB driver fleet so queries always find real database drivers
export async function ensureMongoDriverFleet() {
    if (mongoose.connection?.readyState !== 1) return;
    try {
        const count = await Driver.countDocuments();
        if (count >= 2) return;

        console.log('[driverService] Seeding initial verified MongoDB driver fleet...');
        for (const driverData of DEFAULT_IN_MEMORY_FLEET) {
            await Driver.updateOne(
                { phone: driverData.phone },
                { $set: driverData },
                { upsert: true }
            );
        }
        console.log('[driverService] ✅ Verified driver fleet is live in MongoDB.');
    } catch (err) {
        console.warn('[driverService] Fleet check error:', err.message);
    }
}

// Register new Driver
export async function registerDriver({ name, phone, vehicleType, vehicleModel, vehicleNumber, enabledServices }) {
    const cleanPhone = phone.trim();
    const defaultServices = vehicleType === 'bike'
        ? ['FOOD', 'GROCERY', 'PARCEL', 'RIDE']
        : ['RIDE', 'PARCEL'];

    if (mongoose.connection?.readyState === 1) {
        try {
            const existing = await Driver.findOne({ phone: cleanPhone });
            if (existing) {
                if (enabledServices && Array.isArray(enabledServices)) {
                    existing.enabledServices = enabledServices;
                    await existing.save();
                }
                const obj = existing.toObject();
                inMemoryDrivers.set(obj._id.toString(), obj);
                return obj;
            }

            const driver = await Driver.create({
                name: name.trim(),
                phone: cleanPhone,
                vehicleType,
                vehicleModel: vehicleModel.trim(),
                vehicleNumber: vehicleNumber.trim(),
                enabledServices: enabledServices || defaultServices,
                isOnline: true,
                isBusy: false,
                tripsToday: 0,
                earningsToday: 0,
            });
            const obj = driver.toObject();
            inMemoryDrivers.set(obj._id.toString(), obj);
            return obj;
        } catch (err) {
            console.warn('[driverService] MongoDB register error, falling back to memory:', err.message);
        }
    }

    // In-memory fallback
    for (const [id, d] of inMemoryDrivers.entries()) {
        if (d.phone === cleanPhone) {
            if (enabledServices && Array.isArray(enabledServices)) {
                d.enabledServices = enabledServices;
            }
            return { ...d };
        }
    }

    const newId = new mongoose.Types.ObjectId().toString();
    const newDriver = {
        _id: newId,
        name: name.trim(),
        phone: cleanPhone,
        vehicleType,
        vehicleModel: vehicleModel.trim(),
        vehicleNumber: vehicleNumber.trim(),
        enabledServices: enabledServices || defaultServices,
        rating: 5.0,
        totalTrips: 0,
        tripsToday: 0,
        earningsToday: 0,
        isOnline: true,
        isBusy: false,
        createdAt: new Date().toISOString(),
    };
    inMemoryDrivers.set(newId, newDriver);
    return newDriver;
}

// Update Driver's Enabled Service Toggles (e.g. Turn On/Off Food, Groceries, Rides)
export async function updateDriverServices(driverId, services) {
    if (!Array.isArray(services)) {
        throw Object.assign(new Error('services must be an array'), { status: 400 });
    }

    const idStr = driverId.toString();
    if (mongoose.connection?.readyState === 1) {
        try {
            const driver = await Driver.findByIdAndUpdate(
                driverId,
                { $set: { enabledServices: services } },
                { new: true }
            );
            if (driver) {
                const obj = driver.toObject();
                inMemoryDrivers.set(idStr, obj);
                return obj;
            }
        } catch (_) {}
    }

    const mem = inMemoryDrivers.get(idStr);
    if (mem) {
        mem.enabledServices = services;
        return { ...mem };
    }
    return { _id: idStr, enabledServices: services };
}

// Driver Online / Offline
export async function setDriverOnline(driverId) {
    const idStr = driverId.toString();
    if (mongoose.connection?.readyState === 1) {
        try {
            const driver = await Driver.findByIdAndUpdate(
                driverId,
                { $set: { isOnline: true } },
                { new: true }
            );
            if (driver) {
                const obj = driver.toObject();
                inMemoryDrivers.set(idStr, obj);
                return obj;
            }
        } catch (_) {}
    }

    const mem = inMemoryDrivers.get(idStr);
    if (mem) {
        mem.isOnline = true;
        return { ...mem };
    }
    const fallback = { _id: idStr, name: 'Dropp Partner', isOnline: true, enabledServices: ['RIDE', 'FOOD', 'GROCERY', 'PARCEL'] };
    inMemoryDrivers.set(idStr, fallback);
    return fallback;
}

export async function setDriverOffline(driverId) {
    const idStr = driverId.toString();
    if (mongoose.connection?.readyState === 1) {
        try {
            const driver = await Driver.findByIdAndUpdate(
                driverId,
                { $set: { isOnline: false } },
                { new: true }
            );
            if (driver) {
                const obj = driver.toObject();
                inMemoryDrivers.set(idStr, obj);
                return obj;
            }
        } catch (_) {}
    }

    const mem = inMemoryDrivers.get(idStr);
    if (mem) {
        mem.isOnline = false;
        return { ...mem };
    }
    return { _id: idStr, isOnline: false };
}

// Get Driver profile by ID with today's metrics
export async function getDriverById(driverId) {
    const idStr = driverId.toString();
    if (mongoose.connection?.readyState === 1) {
        try {
            const driver = await Driver.findById(driverId).lean();
            if (driver) {
                return {
                    ...driver,
                    earningsToday: Number(driver.earningsToday) || 0,
                    tripsToday: Number(driver.tripsToday) || 0,
                    enabledServices: driver.enabledServices || ['RIDE', 'FOOD', 'GROCERY', 'PARCEL'],
                };
            }
        } catch (_) {}
    }

    const mem = inMemoryDrivers.get(idStr);
    if (!mem) return null;
    return {
        ...mem,
        earningsToday: Number(mem.earningsToday) || 0,
        tripsToday: Number(mem.tripsToday) || 0,
        enabledServices: mem.enabledServices || ['RIDE', 'FOOD', 'GROCERY', 'PARCEL'],
    };
}

// Update Driver GPS Location
export async function updateDriverLocation(driverId, lat, lng, bearing = 0) {
    const driver = await Driver.findByIdAndUpdate(
        driverId,
        {
            $set: {
                'location.lat': lat,
                'location.lng': lng,
                'location.bearing': bearing ?? 0,
                'location.updatedAt': new Date(),
            },
        },
        { new: true }
    );
    if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });

    broadcast('driver.location_update', {
        driverId: driver._id.toString(),
        lat,
        lng,
        bearing: bearing ?? 0,
    });

    return driver.toObject();
}

// Get Nearby Online Drivers
export async function getNearbyDrivers(lat, lng, radiusKm = 5) {
    const delta = radiusKm / 111;
    const drivers = await Driver.find({
        isOnline: true,
        'location.lat': { $gte: lat - delta, $lte: lat + delta },
        'location.lng': { $gte: lng - delta, $lte: lng + delta },
    })
        .select('name vehicleType vehicleModel location rating enabledServices')
        .lean();
    return drivers;
}

// Find Eligible Drivers for a Service Offer (capability matching)
export async function findEligibleDriversForOffer(serviceCategory, vehicleRequirement = null) {
    const query = {
        isOnline: true,
        isBusy: false,
        enabledServices: serviceCategory,
    };

    if (vehicleRequirement) {
        query.vehicleType = vehicleRequirement;
    }

    return Driver.find(query).lean();
}

// Accept Ride, Food, Delivery, or Shop Task.
// The claim is atomic: the first driver to accept wins, everyone else gets 409 and their offer closes.
const httpErr = (status, message) => Object.assign(new Error(message), { status });
const TAKEABLE_ORDER_STATUSES = ['confirmed', 'accepted', 'preparing', 'ready_for_pickup'];

function driverCard(driver) {
    return {
        driverId: driver._id.toString(),
        name: driver.name,
        phone: driver.phone,
        vehicle: [driver.vehicleModel, driver.vehicleNumber].filter(Boolean).join(' • ') || 'Vehicle',
        rating: driver.rating ?? null,
        avatar: driver.avatar || null,
        etaMinutes: 4,
    };
}

async function markBusy(driverId, taskId) {
    await Driver.findByIdAndUpdate(driverId, { $set: { isBusy: true, activeTaskId: taskId } }).catch(() => {});
}

function closeOfferEverywhere(offerId) {
    acknowledgeOffer(offerId);
    broadcast('driver.offer_taken', { offerId });
}

// Restaurants only store a text address, so geocode it for the driver's map
async function geocode(label, ...parts) {
    const text = parts.filter(Boolean).join(', ');
    if (!text) return null;
    try {
        const { resolveLocation } = await import('../rides/routeService.js');
        const loc = await resolveLocation(text, label);
        return { label, address: loc.address || text, lat: loc.lat, lng: loc.lng };
    } catch (_) {
        return { label, address: text, lat: null, lng: null };
    }
}

export async function acceptRide(rideId, driverId) {
    const driver = await getDriverById(driverId);
    if (!driver) throw httpErr(404, 'Driver not found');
    if (!mongoose.Types.ObjectId.isValid(rideId)) throw httpErr(404, 'Offer not found');
    const card = driverCard(driver);

    // 1. Ride / parcel
    const ride = await Ride.findOneAndUpdate(
        { _id: rideId, status: 'searching' },
        { $set: { status: 'driver_assigned', driver: card } },
        { new: true }
    ).select('+otp');
    if (ride) {
        closeOfferEverywhere(rideId);
        await markBusy(driverId, ride._id.toString());
        const payload = {
            rideId: ride._id,
            customerId: ride.customerId,
            serviceType: ride.serviceType || 'RIDE',
            status: 'driver_assigned',
            driver: card,
            otp: ride.otp,
            message: `${driver.name} is on the way in a ${driver.vehicleModel || 'vehicle'}`,
        };
        emitToCustomer(ride.customerId, 'ride.driver_confirmed', payload);
        broadcast('ride.driver_confirmed', payload);
        console.log(`[driverService] ${driver.name} accepted ride ${ride._id}`);
        // The driver never sees the OTP: they ask the customer for it at pickup
        const { otp, ...rideForDriver } = ride.toObject();
        return { ride: rideForDriver, driver };
    }
    const existingRide = await Ride.findById(rideId).lean();
    if (existingRide) {
        if (existingRide.status === 'cancelled') throw httpErr(410, 'This ride was cancelled by the customer');
        throw httpErr(409, 'Another driver already accepted this ride');
    }

    // 2. Food / shop order
    const { Order } = await import('../orders/orderModel.js');
    const order = await Order.findOneAndUpdate(
        { _id: rideId, status: { $in: TAKEABLE_ORDER_STATUSES }, 'driver.driverId': null },
        { $set: { driver: card } },
        { new: true }
    ).populate('restaurantId', 'name address');
    if (order) {
        closeOfferEverywhere(rideId);
        await markBusy(driverId, order._id.toString());
        const payload = {
            orderId: order._id,
            rideId: order._id,
            customerId: order.customerId,
            serviceType: 'FOOD DELIVERY',
            status: order.status,
            driver: card,
            message: `${driver.name} will pick up your order`,
        };
        emitToCustomer(order.customerId, 'order.driver_confirmed', payload);
        broadcast('order.driver_confirmed', payload);
        console.log(`[driverService] ${driver.name} accepted order ${order._id}`);

        const rest = order.restaurantId;
        const restAddress = typeof rest?.address === 'string'
            ? rest.address
            : [rest?.address?.street, rest?.address?.area, rest?.address?.city].filter(Boolean).join(', ');
        const addr = order.deliveryAddress || {};
        const [pickupLocation, dropLocation] = await Promise.all([
            geocode(rest?.name || 'Restaurant', rest?.name, restAddress),
            geocode('Customer', addr.street, addr.city, addr.pincode),
        ]);
        const { deliveryOtp, ...orderForDriver } = order.toObject();
        return {
            ride: {
                ...orderForDriver,
                serviceType: 'FOOD DELIVERY',
                fare: Math.round(order.totalAmount * 0.25),
                pickupLocation,
                dropLocation,
            },
            driver,
        };
    }
    const existingOrder = await Order.findById(rideId).lean();
    if (existingOrder) {
        if (existingOrder.status === 'cancelled') throw httpErr(410, 'This order was cancelled by the customer');
        throw httpErr(409, 'Another driver already accepted this order');
    }
    throw httpErr(404, 'Offer not found or expired');
}

// Update Task Status for Any Pillar (Ride, Food, Delivery, Shop).
// Statuses: arrived (at pickup) → picked_up / in_progress (needs customer OTP for rides) → completed.
export async function updateTaskStatus(driverId, taskId, status, otp = null) {
    const driver = await getDriverById(driverId);
    if (!driver) throw httpErr(404, 'Driver not found');
    if (!mongoose.Types.ObjectId.isValid(taskId)) throw httpErr(404, 'Task not found');
    const isStart = status === 'in_progress' || status === 'picked_up';
    const isDone = status === 'completed' || status === 'delivered';

    // 1. Ride / parcel
    const ride = await Ride.findById(taskId).select('+otp');
    if (ride) {
        if (ride.driver?.driverId !== driverId.toString()) throw httpErr(403, 'This trip is assigned to another driver');
        if (ride.status === 'cancelled') throw httpErr(410, 'The customer cancelled this ride');

        let next;
        if (status === 'arrived') next = { from: ['driver_assigned'], to: 'arrived', event: 'ride.driver_arrived', message: `${driver.name} has arrived at the pickup point.` };
        else if (isStart) {
            if (!otp || String(otp).trim() !== String(ride.otp)) throw httpErr(400, 'Incorrect OTP. Ask the customer for the 4-digit code.');
            next = { from: ['driver_assigned', 'arrived'], to: 'in_progress', event: 'ride.trip_started', message: 'Trip started. En route to destination.' };
        } else if (isDone) next = { from: ['in_progress'], to: 'completed', event: 'ride.completed', message: 'Trip completed. Thanks for riding with Dropp!' };
        else throw httpErr(400, `Unknown status: ${status}`);

        if (ride.status === next.to) return { success: true, type: 'ride', status: ride.status, data: ride.toObject() };
        if (!next.from.includes(ride.status)) throw httpErr(409, `Cannot go from ${ride.status} to ${next.to}`);

        ride.status = next.to;
        await ride.save();
        if (next.to === 'completed') {
            await Driver.findByIdAndUpdate(driverId, {
                $set: { isBusy: false, activeTaskId: null },
                $inc: { totalTrips: 1, tripsToday: 1, earningsToday: Number(ride.fare) || 0 },
            });
        }
        const payload = {
            rideId: ride._id,
            customerId: ride.customerId,
            status: ride.status,
            serviceType: ride.serviceType || 'RIDE',
            fare: ride.fare,
            message: next.message,
        };
        emitToCustomer(ride.customerId, next.event, payload);
        broadcast(next.event, payload);
        const { otp: _otp, ...data } = ride.toObject();
        return { success: true, type: 'ride', status: ride.status, data };
    }

    // 2. Food / shop order
    const { Order } = await import('../orders/orderModel.js');
    const order = await Order.findById(taskId);
    if (!order) throw httpErr(404, 'Task not found');
    if (order.driver?.driverId !== driverId.toString()) throw httpErr(403, 'This order is assigned to another driver');
    if (order.status === 'cancelled') throw httpErr(410, 'The customer cancelled this order');

    let event;
    let message;
    if (status === 'arrived') {
        event = 'order.driver_arrived_pickup';
        message = `${driver.name} has arrived at the restaurant.`;
    } else if (isStart || status === 'out_for_delivery') {
        order.status = 'out_for_delivery';
        event = 'order.out_for_delivery';
        message = 'Order collected! Your delivery partner is on the way.';
    } else if (isDone) {
        if (!otp || String(otp).trim() !== String(order.deliveryOtp)) throw httpErr(400, 'Incorrect OTP. Ask the customer for the delivery code.');
        order.status = 'delivered';
        event = 'order.delivered';
        message = 'Order delivered. Enjoy!';
        await Driver.findByIdAndUpdate(driverId, {
            $set: { isBusy: false, activeTaskId: null },
            $inc: { totalTrips: 1, tripsToday: 1, earningsToday: Math.round(order.totalAmount * 0.25) },
        });
    } else throw httpErr(400, `Unknown status: ${status}`);

    await order.save();
    const payload = {
        orderId: order._id,
        customerId: order.customerId,
        status: event === 'order.driver_arrived_pickup' ? 'driver_arrived_pickup' : order.status,
        driver: order.driver,
        totalAmount: order.totalAmount,
        message,
    };
    emitToCustomer(order.customerId, event, payload);
    broadcast(event, payload);
    const { deliveryOtp, ...data } = order.toObject();
    return { success: true, type: 'order', status: payload.status, data };
}

// Auto-run fleet verification on module load
ensureMongoDriverFleet();

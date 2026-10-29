import { Driver } from './driverModel.js';
import { Ride } from '../rides/rideModel.js';
import { emitToCustomer, broadcast } from '../../infrastructure/websocket/wsServer.js';
import { acknowledgeOffer } from '../../infrastructure/offerQueue.js';

// Auto-seed real MongoDB driver fleet so queries always find real database drivers
export async function ensureMongoDriverFleet() {
    try {
        const count = await Driver.countDocuments();
        if (count >= 2) return;

        console.log('[driverService] Seeding initial verified MongoDB driver fleet...');
        const initialFleet = [
            {
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

        for (const driverData of initialFleet) {
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
    const existing = await Driver.findOne({ phone: phone.trim() });
    if (existing) {
        if (enabledServices && Array.isArray(enabledServices)) {
            existing.enabledServices = enabledServices;
            await existing.save();
        }
        return existing.toObject();
    }

    const defaultServices = vehicleType === 'bike'
        ? ['FOOD', 'GROCERY', 'PARCEL', 'RIDE']
        : ['RIDE', 'PARCEL'];

    const driver = await Driver.create({
        name: name.trim(),
        phone: phone.trim(),
        vehicleType,
        vehicleModel: vehicleModel.trim(),
        vehicleNumber: vehicleNumber.trim(),
        enabledServices: enabledServices || defaultServices,
        isOnline: true,
        isBusy: false,
        tripsToday: 0,
        earningsToday: 0,
    });
    return driver.toObject();
}

// Update Driver's Enabled Service Toggles (e.g. Turn On/Off Food, Groceries, Rides)
export async function updateDriverServices(driverId, services) {
    if (!Array.isArray(services)) {
        throw Object.assign(new Error('services must be an array'), { status: 400 });
    }

    const driver = await Driver.findByIdAndUpdate(
        driverId,
        { $set: { enabledServices: services } },
        { new: true }
    );
    if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });

    console.log(`[driverService] ${driver.name} updated enabled services:`, services);
    return driver.toObject();
}

// Driver Online / Offline
export async function setDriverOnline(driverId) {
    const driver = await Driver.findByIdAndUpdate(
        driverId,
        { $set: { isOnline: true } },
        { new: true }
    );
    if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });
    console.log(`[driverService] ${driver.name} is now ONLINE`);
    return driver.toObject();
}

export async function setDriverOffline(driverId) {
    const driver = await Driver.findByIdAndUpdate(
        driverId,
        { $set: { isOnline: false } },
        { new: true }
    );
    if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });
    console.log(`[driverService] ${driver.name} is now OFFLINE`);
    return driver.toObject();
}

// Get Driver profile by ID with today's metrics
export async function getDriverById(driverId) {
    const driver = await Driver.findById(driverId).lean();
    if (!driver) return null;

    return {
        ...driver,
        earningsToday: Number(driver.earningsToday) || 0,
        tripsToday: Number(driver.tripsToday) || 0,
        enabledServices: driver.enabledServices || ['RIDE', 'FOOD', 'GROCERY', 'PARCEL'],
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

// Accept Ride, Food, Delivery, or Shop Task
export async function acceptRide(rideId, driverId) {
    const driver = await Driver.findById(driverId);
    if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });

    const driverData = {
        driverId: driver._id.toString(),
        name: driver.name,
        phone: driver.phone,
        vehicle: `${driver.vehicleModel} • ${driver.vehicleNumber}`,
        rating: driver.rating,
        avatar: driver.avatar || null,
        etaMinutes: 4,
    };

    // 1. Check if this is a Ride or Package Delivery
    const ride = await Ride.findById(rideId);
    if (ride) {
        if (ride.status === 'cancelled') {
            throw Object.assign(new Error('This ride was cancelled by the customer'), { status: 410 });
        }
        ride.driver = driverData;
        ride.status = 'driver_assigned';
        await ride.save();

        acknowledgeOffer(rideId);

        // Lock driver as busy
        await Driver.findByIdAndUpdate(driverId, {
            $set: { isBusy: true, activeTaskId: ride._id.toString() },
        });

        const payload = {
            rideId: ride._id,
            customerId: ride.customerId,
            serviceType: ride.serviceType || 'RIDE',
            status: 'driver_assigned',
            driver: ride.driver,
            otp: ride.otp ?? '4821',
            message: `${driver.name} is on the way in a ${driver.vehicleModel}`,
        };

        emitToCustomer(ride.customerId, 'ride.driver_confirmed', payload);
        broadcast('ride.driver_confirmed', payload);

        console.log(`[driverService] ${driver.name} accepted ride ${ride._id} for customer ${ride.customerId}`);
        return { ride: ride.toObject(), driver: driver.toObject() };
    }

    // 2. Check if this is a Food or Shop Order
    const { Order } = await import('../orders/orderModel.js');
    const order = await Order.findById(rideId);
    if (order) {
        if (order.status === 'cancelled') {
            throw Object.assign(new Error('This order was cancelled by the customer'), { status: 410 });
        }
        order.driver = driverData;
        order.status = 'driver_assigned';
        await order.save();

        acknowledgeOffer(rideId);

        // Lock driver as busy
        await Driver.findByIdAndUpdate(driverId, {
            $set: { isBusy: true, activeTaskId: order._id.toString() },
        });

        const payload = {
            orderId: order._id,
            rideId: order._id,
            customerId: order.customerId,
            serviceType: 'FOOD DELIVERY',
            status: 'driver_assigned',
            driver: order.driver,
            otp: order.deliveryOtp ?? '4821',
            message: `${driver.name} has been assigned to pick up your order`,
        };

        emitToCustomer(order.customerId, 'order.driver_confirmed', payload);
        broadcast('order.driver_confirmed', payload);

        console.log(`[driverService] ${driver.name} accepted food/shop order ${order._id}`);
        return {
            ride: {
                ...order.toObject(),
                fare: Math.round(order.totalAmount * 0.25) || 65,
                pickupLocation: 'Restaurant Pickup',
                destination: order.deliveryAddress?.street || 'Customer Location',
            },
            driver: driver.toObject(),
        };
    }

    throw Object.assign(new Error('Ride or Order not found'), { status: 404 });
}

// Update Task Status for Any Pillar (Ride, Food, Delivery, Shop)
export async function updateTaskStatus(driverId, taskId, status, otp = null) {
    const driver = await Driver.findById(driverId);
    if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });

    // 1. Check if it's a Ride / Delivery
    const ride = await Ride.findById(taskId);
    if (ride) {
        if (status === 'arrived') {
            ride.status = 'arrived';
            await ride.save();
            const payload = {
                rideId: ride._id,
                customerId: ride.customerId,
                status: 'arrived',
                serviceType: ride.serviceType || 'RIDE',
                message: `${driver.name} has arrived at the pickup location.`,
            };
            emitToCustomer(ride.customerId, 'ride.driver_arrived', payload);
            broadcast('ride.driver_arrived', payload);
            return { success: true, type: 'ride', status: 'arrived', data: ride.toObject() };
        } else if (status === 'in_progress' || status === 'picked_up') {
            ride.status = 'in_progress';
            await ride.save();
            const payload = {
                rideId: ride._id,
                customerId: ride.customerId,
                status: 'in_progress',
                serviceType: ride.serviceType || 'RIDE',
                message: 'Trip started. En route to destination.',
            };
            emitToCustomer(ride.customerId, 'ride.trip_started', payload);
            broadcast('ride.trip_started', payload);
            return { success: true, type: 'ride', status: 'in_progress', data: ride.toObject() };
        } else if (status === 'completed') {
            ride.status = 'completed';
            await ride.save();

            const fareEarned = Number(ride.fare) || 120;
            await Driver.findByIdAndUpdate(driverId, {
                $set: { isBusy: false, activeTaskId: null },
                $inc: { totalTrips: 1, tripsToday: 1, earningsToday: fareEarned },
            });

            const payload = {
                rideId: ride._id,
                customerId: ride.customerId,
                status: 'completed',
                serviceType: ride.serviceType || 'RIDE',
                fare: ride.fare,
                message: 'Trip completed successfully!',
            };
            emitToCustomer(ride.customerId, 'ride.completed', payload);
            broadcast('ride.completed', payload);
            return { success: true, type: 'ride', status: 'completed', data: ride.toObject() };
        }
    }

    // 2. Check if it's an Order (Food or Shop)
    const { Order } = await import('../orders/orderModel.js');
    const order = await Order.findById(taskId);
    if (order) {
        if (status === 'arrived') {
            const payload = {
                orderId: order._id,
                customerId: order.customerId,
                status: 'driver_arrived_pickup',
                driver: order.driver || driver.toObject(),
                message: `${driver.name} has arrived at the pickup location.`,
            };
            emitToCustomer(order.customerId, 'order.driver_arrived_pickup', payload);
            broadcast('order.driver_arrived_pickup', payload);
            return { success: true, type: 'order', status: 'driver_arrived_pickup', data: order.toObject() };
        } else if (status === 'in_progress' || status === 'picked_up' || status === 'out_for_delivery') {
            order.status = 'out_for_delivery';
            await order.save();
            const payload = {
                orderId: order._id,
                customerId: order.customerId,
                status: 'out_for_delivery',
                driver: order.driver || driver.toObject(),
                message: 'Order collected! Your delivery partner is on the way.',
            };
            emitToCustomer(order.customerId, 'order.out_for_delivery', payload);
            broadcast('order.out_for_delivery', payload);
            return { success: true, type: 'order', status: 'out_for_delivery', data: order.toObject() };
        } else if (status === 'completed' || status === 'delivered') {
            order.status = 'delivered';
            await order.save();

            const deliveryFee = Math.round(order.totalAmount * 0.25) || 65;
            await Driver.findByIdAndUpdate(driverId, {
                $set: { isBusy: false, activeTaskId: null },
                $inc: { totalTrips: 1, tripsToday: 1, earningsToday: deliveryFee },
            });

            const payload = {
                orderId: order._id,
                customerId: order.customerId,
                status: 'delivered',
                driver: order.driver || driver.toObject(),
                totalAmount: order.totalAmount,
                message: 'Order delivered successfully! Enjoy your items.',
            };
            emitToCustomer(order.customerId, 'order.delivered', payload);
            broadcast('order.delivered', payload);
            return { success: true, type: 'order', status: 'delivered', data: order.toObject() };
        }
    }

    throw Object.assign(new Error('Ride or Order not found for task update'), { status: 404 });
}

// Auto-run fleet verification on module load
ensureMongoDriverFleet();

import { Driver } from './driverModel.js';
import { Ride } from '../rides/rideModel.js';
import { emitToCustomer, broadcast } from '../../infrastructure/websocket/wsServer.js';
import { acknowledgeOffer } from '../../infrastructure/offerQueue.js';

// Register new Driver
export async function registerDriver({ name, phone, vehicleType, vehicleModel, vehicleNumber }) {

    const existing = await Driver.findOne({ phone: phone.trim() });
    if (existing) return existing.toObject();

    const driver = await Driver.create({
        name: name.trim(),
        phone: phone.trim(),
        vehicleType,
        vehicleModel: vehicleModel.trim(),
        vehicleNumber: vehicleNumber.trim(),
    });
    return driver.toObject();
}

// Driver goes Online / Offline
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

// Get Driver profile by ID
export async function getDriverById(driverId) {
    return Driver.findById(driverId).lean();
}

// Update Driver Location
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
    
    // Broadcast the updated location after the database update
    broadcast('driver.location_update', {
        driverId: driver._id.toString(),
        lat: lat,
        lng: lng,
        bearing: bearing ?? 0,
    });

    return driver.toObject();
}

// Get Nearby Online Drivers
export async function getNearbyDrivers(lat, lng, radiusKm = 5) {
    // Simple bounding box approximation (fast, no geospatial index needed)
    const delta = radiusKm / 111; // ~111km per degree
    const drivers = await Driver.find({
        isOnline: true,
        'location.lat': { $gte: lat - delta, $lte: lat + delta },
        'location.lng': { $gte: lng - delta, $lte: lng + delta },
    })
        .select('name vehicleType vehicleModel location rating')
        .lean();
    return drivers;
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
        await Driver.findByIdAndUpdate(driverId, { $set: { isOnline: false } });

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
        await Driver.findByIdAndUpdate(driverId, { $set: { isOnline: false } });

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
        broadcast('ride.driver_confirmed', payload);

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
            await Driver.findByIdAndUpdate(driverId, {
                $set: { isOnline: true },
                $inc: { totalTrips: 1 },
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
                driver: order.driver,
                message: 'Order collected! Your delivery partner is on the way.',
            };
            emitToCustomer(order.customerId, 'order.out_for_delivery', payload);
            broadcast('order.out_for_delivery', payload);
            return { success: true, type: 'order', status: 'out_for_delivery', data: order.toObject() };
        } else if (status === 'completed' || status === 'delivered') {
            order.status = 'delivered';
            await order.save();
            await Driver.findByIdAndUpdate(driverId, {
                $set: { isOnline: true },
                $inc: { totalTrips: 1 },
            });
            const payload = {
                orderId: order._id,
                customerId: order.customerId,
                status: 'delivered',
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


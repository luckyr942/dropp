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
export async function updateDriverLocation(driverId, lat, lng) {
    const driver = await Driver.findByIdAndUpdate(
        driverId,
        {
            $set: {
                'location.lat': lat,
                'location.lng': lng,
                'location.updatedAt': new Date(),
            },
        },
        { new: true }
    );
    if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });
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

// Accept Ride
export async function acceptRide(rideId, driverId) {
    const [ride, driver] = await Promise.all([
        Ride.findById(rideId),
        Driver.findById(driverId),
    ]);

    if (!ride)   throw Object.assign(new Error('Ride not found'), { status: 404 });
    if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });

    if (ride.status === 'cancelled') {
        throw Object.assign(new Error('This ride was cancelled by the customer'), { status: 410 });
    }
    if (!['driver_assigned', 'searching'].includes(ride.status)) {
        throw Object.assign(
            new Error(`Ride cannot be accepted — current status: ${ride.status}`),
            { status: 409 }
        );
    }

    // Update ride with real driver data from MongoDB
    ride.driver = {
        driverId: driver._id.toString(),
        name: driver.name,
        phone: driver.phone,
        vehicle: `${driver.vehicleModel} • ${driver.vehicleNumber}`,
        rating: driver.rating,
        avatar: driver.avatar || null,
        etaMinutes: 4,
    };
    await ride.save();

    // Remove this offer from the queue so no other driver gets it
    acknowledgeOffer(rideId);

    // Mark driver as busy
    await Driver.findByIdAndUpdate(driverId, { $set: { isOnline: false } });

    // Notify the specific customer their real driver is confirmed
    const payload = {
        rideId: ride._id,
        customerId: ride.customerId,
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

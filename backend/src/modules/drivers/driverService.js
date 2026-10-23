import { Driver } from "./driverModel.js";
import { Ride } from "../rides/rideModel.js";
import { emitToCustomer, broadcast } from "../../infrastructure/websocket/wsServer.js";

//register a new driver
export async function registerDriver({ name, phone, vehicleType, vehicleModel, vehicleNumber }){

    const existingDriver = await Driver.findOne({ phone: phone.trim()});
    if(existingDriver) return existingDriver.toObject();

    const driver = await Driver.create({
        name: name.trim(),
        phone: phone.trim(),
        vehicleType,
        vehicleModel: vehicleModel.trim(),
        vehicleNumber: vehicleNumber.trim(),
    });

    return driver.toObject();
}

//Driver goes Online
export async function setDriverOnline(driverId){
    const driver = await Driver.findByIdAndUpdate(
        driverId,
        { $set: { isOnline: true } },
        { new: true }
    );
    if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });
    return driver.toObject();
}

//Driver goes Offline
export async function setDriverOffline(driverId) {
  const driver = await Driver.findByIdAndUpdate(
    driverId,
    { $set: { isOnline: false } },
    { new: true }
  );
  if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });
  return driver.toObject();
}


// Get driver profile by ID
export async function getDriverById(driverId) {
  return Driver.findById(driverId).lean();
}


// Driver accepts a ride offer.
export async function acceptRide(rideId, driverId) {
  const [ride, driver] = await Promise.all([
    Ride.findById(rideId),
    Driver.findById(driverId),
  ]);
  if (!ride) {
    throw Object.assign(new Error('Ride not found'), { status: 404 });
  }
  if (!driver) {
    throw Object.assign(new Error('Driver not found'), { status: 404 });
  }
  if (ride.status === 'cancelled') {
    throw Object.assign(new Error('This ride was cancelled by the customer'), { status: 410 });
  }
  if (ride.status !== 'driver_assigned') {
    throw Object.assign(
      new Error(`Ride cannot be accepted — current status is: ${ride.status}`),
      { status: 409 }
    );
  }

  // Update the ride with real driver information from MongoDB
  ride.driver = {
    driverId: driver._id.toString(),
    name: driver.name,
    phone: driver.phone,
    vehicle: `${driver.vehicleModel} • ${driver.vehicleNumber}`,
    rating: driver.rating,
    avatar: driver.avatar || null,
  };
  await ride.save();

   // Mark driver as busy (optional — prevents double-dispatch)
  await Driver.findByIdAndUpdate(driverId, { $set: { isOnline: false } });

  // Notify customer with real driver data
  const eventPayload = {
    rideId: ride._id,
    customerId: ride.customerId,
    status: 'driver_assigned',
    driver: ride.driver,
    otp: ride.otp ?? '4821',
    message: `${driver.name} is on the way in a ${driver.vehicleModel}`,
  };
  emitToCustomer(ride.customerId, 'ride.driver_confirmed', eventPayload);
  broadcast('ride.driver_confirmed', eventPayload);
  console.log(`[driverService] Driver ${driver.name} accepted ride ${ride._id}`);
  return { ride: ride.toObject(), driver: driver.toObject() };
}

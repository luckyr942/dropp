import mongoose from 'mongoose';
import { Ride, RideQuote } from './rideModel.js';
import { getRoute } from './routeService.js';
import { broadcast, emitToCustomer } from '../../infrastructure/websocket/wsServer.js';

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
    console.warn('[estimateRide] Could not persist quote: ', err.message );
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

// Simulating a ride's progress and sending real-time updates to the customer's app
function scheduleSimulatedRide(ride, customerId){
  const steps = [
    [8000, 'arrived', 'ride.driver_arrived',
    'Your driver has arrived at the pickup point.'],
    [15000, 'in_progress', 'ride.trip_started',
    'Your trip has started. Enjoy the ride!'],
  ];

  for(const [ms, status, eventType, message] of steps){
    setTimeout(async() => {
      try{
        //Re-fetch from DB to get latest state(user may have cancellded)
        const fresh = await Ride.findById(ride._id);
        if(!fresh){
          console.warn(`[scheduleSimulatedRide] Ride ${ride._id} not found at step ${status}`);
          return;
        }
        if(['cancelled', 'completed'].includes(fresh.status)){
          console.log(`[scheduleSimulatedRide] Ride ${ride._id} is ${fresh.status} — skipping ${eventType}`);
          return;
        }

        //save new status to DB before emitting
        fresh.status = status;
        await fresh.save();

        //emut only to the customer who booked this ride
        emitToCustomer(customerId, eventType, {
          rideId: ride._id,
          customerId,
          status,
          message,
        });
        console.log(`[scheduleSimulatedRide] Emitted ${eventType} for ride ${ride._id}`);
      } catch (err) {
        console.error('[scheduleSimulatedRide] Error at step', status, ':', err.stack ?? err.message);
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
        const realDriver = await Driver.findOne({ isOnline: true }).lean();
        if (realDriver) {
            driver = {
                name: realDriver.name,
                phone: realDriver.phone,
                vehicle: `${realDriver.vehicleModel} • ${realDriver.vehicleNumber}`,
                rating: realDriver.rating,
                avatar: realDriver.avatar || null,
                etaMinutes: 3,
            };
        }
    } catch (_) {}
    // 2. Fallback: large realistic pool so every booking gets a unique-feeling driver
    if (!driver) {
    const DRIVERS = [
        { name: 'Vikram Singh',    phone: '+91 98112 34567', vehicle: 'White Swift Dzire • DL 1Z A 4421',  rating: 4.89, avatar: null, etaMinutes: 4 },
        { name: 'Rajesh Sharma',   phone: '+91 99234 56789', vehicle: 'Yellow Bajaj Auto • HR 26 AT 8812',  rating: 4.75, avatar: null, etaMinutes: 5 },
        { name: 'Mohit Verma',     phone: '+91 97123 45678', vehicle: 'Honda Activa • DL 4S B 1092',        rating: 4.92, avatar: null, etaMinutes: 3 },
        { name: 'Arjun Nair',      phone: '+91 96321 78900', vehicle: 'Maruti Suzuki Ertiga • KA 05 MX 7741', rating: 4.81, avatar: null, etaMinutes: 6 },
        { name: 'Suresh Pillai',   phone: '+91 98765 12300', vehicle: 'TVS Jupiter • TN 09 BZ 3321',         rating: 4.67, avatar: null, etaMinutes: 4 },
        { name: 'Deepak Yadav',    phone: '+91 97890 45612', vehicle: 'Hyundai Grand i10 • UP 14 CK 9901',  rating: 4.88, avatar: null, etaMinutes: 5 },
        { name: 'Rahul Gupta',     phone: '+91 99001 23344', vehicle: 'Wagon R CNG • DL 01 CC 5510',        rating: 4.79, avatar: null, etaMinutes: 4 },
        { name: 'Sanjay Mishra',   phone: '+91 95555 67890', vehicle: 'Tata Indica • RJ 14 GA 4410',        rating: 4.72, avatar: null, etaMinutes: 7 },
        { name: 'Anil Kumar',      phone: '+91 98444 11234', vehicle: 'Mahindra eVerito • DL 7CF AB 2231',  rating: 4.95, avatar: null, etaMinutes: 3 },
        { name: 'Manoj Tiwari',    phone: '+91 91234 56789', vehicle: 'Toyota Innova • UP 32 CT 8812',      rating: 4.86, avatar: null, etaMinutes: 8 },
        { name: 'Pradeep Bose',    phone: '+91 90012 34567', vehicle: 'Bajaj Pulsar • WB 29 AB 6634',       rating: 4.70, avatar: null, etaMinutes: 4 },
        { name: 'Kiran Reddy',     phone: '+91 92222 88811', vehicle: 'Honda City • TS 08 EZ 4411',         rating: 4.91, avatar: null, etaMinutes: 5 },
    ];
    driver = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
}

    const ride = await Ride.create({
        customerId,
        pickupLocation: pickupLoc,
        dropLocation: dropLoc,
        rideType,
        fare: fareAmount,
        distanceKm: distKm,
        estimatedMins: durMins,
        routeGeometry: routeGeo,
        otp: Math.floor(1000 + Math.random() * 9000).toString(),
        driver,
        status: 'driver_assigned',
        quoteId,
    });
    try {
        const offerData = {
            offerId: ride._id ? ride._id.toString() : 'ride_' + Date.now(),
            serviceType: 'RIDE',
            title: `NEW ${String(rideType).toUpperCase()} REQUEST`,
            fare: `₹${fareAmount}`,
            fareNumber: fareAmount,
            distance: `${distKm || 4.5} km • ${durMins || 14} mins`,
            pickup: pickupLoc || 'Sector 28, Gurugram',
            destination: dropLoc || 'Cyber Hub Building 10, Gurugram',
            otp: ride.otp || '4821',
            vehicleTier: rideType,
            customerName: 'Rahul Verma',
            customerRating: '4.9 ★',
            createdAt: new Date().toISOString(),
        };

        setLatestDriverOffer(offerData);

        broadcast('driver.incoming_offer', offerData);
        broadcast('ride.driver_assigned', {
            rideId: ride._id,
            customerId,
            status: 'driver_assigned',
            driver,
            otp: ride.otp,
        });
    } catch (_) {}
    return ride.toObject();
    }

    let latestDriverOffer = null;
    export function setLatestDriverOffer(offer) {
        latestDriverOffer = offer;
    }
    export function getLatestDriverOffer() {
        return latestDriverOffer;
    }
    export async function getActiveRide(customerId = 'cust_live_001') {
    return Ride.findOne({
        customerId,
        status: { $in: ['searching', 'driver_assigned', 'arrived', 'in_progress'] },
    })
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
    return ride.toObject();
}
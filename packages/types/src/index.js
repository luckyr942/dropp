// Ride State Machine Status

export const rideStatus = Object.freeze({
    REQUESTED: 'REQUESTED',
    SEARCHING_DRIVER: 'SEARCHING_DRIVER',
    DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
    DRIVER_ARRIVED: 'DRIVER_ARRIVED',
    RIDE_STARTED: 'RIDE_STARTED',
    RIDE_IN_PROGRESS: 'RIDE_IN_PROGRESS',
    RIDE_COMPLETED: 'RIDE_COMPLETED',
    PAYMENT_PENDING: 'PAYMENT_PENDING',
    PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
    COMPLETED: 'COMPLETED', 
    CANCELLED: 'CANCELLED',
});

//Driver Presence & Availablity Sattuses

export const driverStatus = Object.freeze({
    OFFLINE: 'OFFLINE',
    ONLINE: 'ONLINE',
    AVAILABLE: 'AVAILABLE',
    RESERVED: 'RESERVED',
    ON_TRIP: 'ON_TRIP',
    SUSPENDED: 'SUSPENDED',
});

//User Roles

export const userRoles = Object.freeze({
    RIDER: 'RIDER',
    DRIVER: 'DRIVER',
    RESTAURANT: 'RESTAURANT',
    ADMIN: 'ADMIN',
});

// Payment Lifecycle Status

export const paymentStatus = Object.freeze({
    CREATED: 'CREATED',
    PROCESSING: 'PROCESSING',
    SUCCEEDED: 'SUCCEEDED',
    FAILED: 'FAILED',
});


//Vehical Status / Categories

export const vehicalType = Object({
    BIKE: 'BIKE',
    AUTO: 'AUTO',
    CAB_ECO: 'CAB_ECO',
    CAB_PREMIUM: 'CAB_PREMIUM',
    CAB_LUXURY: 'CAB_LUXURY',
    CARRIER_BIKE: 'CARRIER_BIKE',
});
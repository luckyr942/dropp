import mongoose from 'mongoose';

const subTaskSchema = new mongoose.Schema(
    {
        serviceCategory: {
            type: String,
            enum: ['RIDE', 'FOOD', 'GROCERY', 'PHARMACY', 'PARCEL', 'SHOP'],
            required: true,
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'tasks.entityModel',
            required: true,
        },
        entityModel: {
            type: String,
            enum: ['Ride', 'Order'],
            required: true,
        },
        title: { type: String, default: '' },
        status: {
            type: String,
            // 'confirmed' is a valid food-order status returned by confirmSessionOrder
            enum: ['pending', 'confirmed', 'driver_assigned', 'preparing', 'picked_up', 'in_progress', 'completed', 'delivered', 'cancelled'],
            default: 'pending',
        },
        pickupLocation: {
            address: { type: String, default: '' },
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
        },
        dropLocation: {
            address: { type: String, default: '' },
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
        },
        assignedDriver: {
            driverId: { type: String, default: null },
            name: { type: String, default: null },
            phone: { type: String, default: null },
            vehicle: { type: String, default: null },
            avatar: { type: String, default: null },
            rating: { type: Number, default: 5.0 },
        },
        fare: { type: Number, default: 0 },
        etaMinutes: { type: Number, default: 0 },
        otp: { type: String, default: '4821' },
    },
    { _id: true, timestamps: true }
);

const multiServiceSessionSchema = new mongoose.Schema(
    {
        customerId: {
            type: String,
            required: true,
            index: true,
        },
        sessionId: {
            type: String,
            default: null,
            index: true,
        },
        services: {
            type: [String],
            enum: ['RIDE', 'FOOD', 'GROCERY', 'PHARMACY', 'PARCEL', 'SHOP'],
            required: true,
        },
        status: {
            type: String,
            enum: ['INITIALIZING', 'IN_PROGRESS', 'PARTIALLY_COMPLETED', 'COMPLETED', 'CANCELLED'],
            default: 'INITIALIZING',
            index: true,
        },

        // Polymorphic task list
        tasks: [subTaskSchema],

        // Direct references for fast lookup and backward compatibility
        rideId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Ride',
            default: null,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null,
        },

        // Real-time synchronization metrics
        rideEtaMins: { type: Number, default: 0 },
        foodEtaMins: { type: Number, default: 0 },
        syncDeltaMins: { type: Number, default: 0 },
        summaryMessage: { type: String, default: '' },
    },
    { timestamps: true }
);

export const MultiServiceSession = mongoose.model('MultiServiceSession', multiServiceSessionSchema);

import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema(
    {
        // Identity
        name:         { type: String, required: true, trim: true },
        phone:        { type: String, required: true, trim: true, unique: true },

        // Vehicle
        vehicleType: {
            type: String,
            enum: ['bike', 'auto', 'cab_economy', 'cab_premium'],
            required: true,
        },
        vehicleModel:  { type: String, required: true, trim: true },
        vehicleNumber: { type: String, required: true, trim: true },

        // Multi-Service Capability Toggles
        // Drivers can toggle which services they want to accept
        enabledServices: {
            type: [String],
            enum: ['RIDE', 'FOOD', 'GROCERY', 'PARCEL', 'PHARMACY'],
            default: ['RIDE', 'FOOD', 'GROCERY', 'PARCEL', 'PHARMACY'],
            index: true,
        },

        // Performance & Day Metrics
        rating:        { type: Number, default: 5.0, min: 1, max: 5 },
        totalTrips:    { type: Number, default: 0 },
        tripsToday:    { type: Number, default: 0 },
        earningsToday: { type: Number, default: 0 },

        // Availability & Work Status
        isOnline:      { type: Boolean, default: false, index: true },
        isBusy:        { type: Boolean, default: false, index: true }, // True when currently on a trip
        activeTaskId:  { type: String,  default: null },

        // Real-time GPS location (updated by driver app every 4s)
        location: {
            lat:       { type: Number, default: null },
            lng:       { type: Number, default: null },
            bearing:   { type: Number, default: 0 },
            updatedAt: { type: Date,   default: null },
        },

        // Profile photo
        avatar: { type: String, default: null },
    },
    { timestamps: true }
);

// Compound index for fast nearby online dispatch queries
driverSchema.index({ isOnline: 1, isBusy: 1, 'location.lat': 1, 'location.lng': 1 });

export const Driver = mongoose.model('Driver', driverSchema);

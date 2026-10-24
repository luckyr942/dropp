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

        // Performance
        rating:     { type: Number, default: 5.0, min: 1, max: 5 },
        totalTrips: { type: Number, default: 0 },

        // Availability
        isOnline: { type: Boolean, default: false, index: true },

        // Real-time GPS location (updated by driver app every 10s)
        location: {
            lat:       { type: Number, default: null },
            lng:       { type: Number, default: null },
            updatedAt: { type: Date,   default: null },
        },

        // Profile photo
        avatar: { type: String, default: null },
    },
    { timestamps: true }
);

// Index for fast nearby-driver queries
driverSchema.index({ isOnline: 1, 'location.lat': 1, 'location.lng': 1 });

export const Driver = mongoose.model('Driver', driverSchema);

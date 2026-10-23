// backend/src/modules/drivers/driverModel.js
// A driver/captain who works on the Dropp platform.
// They register once, then go online/offline per shift.

import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema(
  {
    // Human identity
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true },

    // Vehicle
    vehicleType: {
      type: String,
      enum: ['bike', 'auto', 'cab_economy', 'cab_premium'],
      required: true,
    },
    vehicleModel: { type: String, required: true, trim: true },   // e.g. "Honda Activa"
    vehicleNumber: { type: String, required: true, trim: true },  // e.g. "DL 4S AB 1234"

    // Performance (start at 5.0, updated as trips complete)
    rating: { type: Number, default: 5.0, min: 1, max: 5 },
    totalTrips: { type: Number, default: 0 },

    // Availability — set true when driver opens app and taps Go Online
    isOnline: { type: Boolean, default: false, index: true },

    // Optional avatar URL
    avatar: { type: String, default: null },
  },
  { timestamps: true }
);

export const Driver = mongoose.model('Driver', driverSchema);

import mongoose from 'mongoose';

// ── 1. Location Sub-Schema 
const locationSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

// ── 2. Assigned Driver Sub-Schema 
const driverInfoSchema = new mongoose.Schema(
  {
    driverId: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    vehicle: {
      type: String,
      default: null,
    },
    rating: {
      type: Number,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

// ── 3. Ride Model 
const rideSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      index: true,
    },

    pickupLocation: {
      type: locationSchema,
      required: true,
    },

    dropLocation: {
      type: locationSchema,
      required: true,
    },

    rideType: {
      type: String,
      enum: ['bike', 'auto', 'cab_economy', 'cab_premium'],
      required: true,
      default: 'cab_economy',
      index: true,
    },

    fare: {
      type: Number,
      required: true,
      min: 0,
    },

    distanceKm: {
      type: Number,
      required: true,
      min: 0,
    },

    estimatedMins: {
      type: Number,
      required: true,
      min: 0,
    },

    routeGeometry: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    otp: {
      type: String,
      required: true,
      select: false,
    },

    driver: {
      type: driverInfoSchema,
      default: () => ({}),
    },

    status: {
      type: String,
      enum: [
        'searching',
        'driver_assigned',
        'arrived',
        'in_progress',
        'completed',
        'cancelled',
      ],
      default: 'searching',
      index: true,
    },

    quoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RideQuote',
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

rideSchema.index({ customerId: 1, status: 1 });

// ── 4. Temporary Fare Quote Model
const rideQuoteSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      index: true,
    },

    pickup: {
      type: locationSchema,
      required: true,
    },

    drop: {
      type: locationSchema,
      required: true,
    },

    distanceKm: {
      type: Number,
      required: true,
      min: 0,
    },

    durationMins: {
      type: Number,
      required: true,
      min: 0,
    },

    geometry: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    fares: [
      {
        type: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        fare: {
          type: Number,
          required: true,
          min: 0,
        },
        etaMins: {
          type: Number,
          required: true,
          min: 0,
        },
        icon: {
          type: String,
          default: 'car',
        },
      },
    ],

    usedAt: {
      type: Date,
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600,
    },
  },
  {
    timestamps: true,
  }
);

// ── 5. Export Models ────────────────────────────────────────────
export const Ride = mongoose.model('Ride', rideSchema);
export const RideQuote = mongoose.model('RideQuote', rideQuoteSchema);


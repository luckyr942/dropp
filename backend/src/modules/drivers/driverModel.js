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

// In-Memory Fallback when MongoDB is offline / disconnected
const inMemoryFleet = new Map([
    [
        '672378901234567890123401',
        {
            _id: new mongoose.Types.ObjectId('672378901234567890123401'),
            name: 'Pradeep Bose',
            phone: '+91 98101 23456',
            vehicleType: 'cab_economy',
            vehicleModel: 'Maruti Dzire White',
            vehicleNumber: 'DL 01 AB 4001',
            enabledServices: ['RIDE', 'PARCEL'],
            rating: 4.9,
            totalTrips: 184,
            tripsToday: 3,
            earningsToday: 840,
            isOnline: true,
            isBusy: false,
            location: { lat: 28.4720, lng: 77.0890, bearing: 45, updatedAt: new Date() },
            toObject() { return { ...this }; },
        },
    ],
    [
        '672378901234567890123402',
        {
            _id: new mongoose.Types.ObjectId('672378901234567890123402'),
            name: 'Rohan Sharma',
            phone: '+91 98202 34567',
            vehicleType: 'bike',
            vehicleModel: 'TVS NTorq 125',
            vehicleNumber: 'HR 26 DK 8812',
            enabledServices: ['FOOD', 'GROCERY', 'PHARMACY', 'PARCEL'],
            rating: 4.8,
            totalTrips: 92,
            tripsToday: 4,
            earningsToday: 420,
            isOnline: true,
            isBusy: false,
            location: { lat: 28.4760, lng: 77.0920, bearing: 90, updatedAt: new Date() },
            toObject() { return { ...this }; },
        },
    ],
    [
        '672378901234567890123403',
        {
            _id: new mongoose.Types.ObjectId('672378901234567890123403'),
            name: 'Rome',
            phone: '+91 98765 43210',
            vehicleType: 'bike',
            vehicleModel: 'Honda Activa 6G',
            vehicleNumber: 'DL 3S CD 9021',
            enabledServices: ['RIDE', 'FOOD', 'GROCERY', 'PARCEL', 'PHARMACY'],
            rating: 5.0,
            totalTrips: 340,
            tripsToday: 6,
            earningsToday: 1260,
            isOnline: true,
            isBusy: false,
            location: { lat: 28.4740, lng: 77.0850, bearing: 180, updatedAt: new Date() },
            toObject() { return { ...this }; },
        },
    ],
]);

function makeDoc(data) {
    if (!data) return null;
    return {
        ...data,
        toObject() { return { ...this }; },
        save() { return Promise.resolve(this); },
    };
}

const origFindByIdAndUpdate = Driver.findByIdAndUpdate.bind(Driver);
const origFindById = Driver.findById.bind(Driver);
const origFindOne = Driver.findOne.bind(Driver);
const origFind = Driver.find.bind(Driver);
const origCreate = Driver.create.bind(Driver);
const origUpdateOne = Driver.updateOne.bind(Driver);
const origCount = Driver.countDocuments.bind(Driver);

Driver.findByIdAndUpdate = function (id, update, options, ...args) {
    if (mongoose.connection?.readyState === 1) {
        try {
            return origFindByIdAndUpdate(id, update, options, ...args);
        } catch (_) {}
    }
    const idStr = id?.toString();
    let driver = inMemoryFleet.get(idStr);
    if (!driver) {
        driver = {
            _id: new mongoose.Types.ObjectId(idStr?.length === 24 ? idStr : undefined),
            name: 'Dropp Partner',
            isOnline: true,
            isBusy: false,
            earningsToday: 0,
            tripsToday: 0,
            enabledServices: ['RIDE', 'FOOD', 'GROCERY', 'PARCEL'],
            location: { lat: 28.4720, lng: 77.0890, bearing: 0, updatedAt: new Date() },
        };
        inMemoryFleet.set(driver._id.toString(), driver);
    }
    if (update?.$set) {
        for (const [k, v] of Object.entries(update.$set)) {
            if (k.startsWith('location.')) {
                driver.location = driver.location || {};
                driver.location[k.replace('location.', '')] = v;
            } else {
                driver[k] = v;
            }
        }
    }
    const wrapped = makeDoc(driver);
    return {
        ...wrapped,
        lean: () => Promise.resolve({ ...driver }),
        then: (resolve) => resolve(wrapped),
        catch: () => Promise.resolve(null),
    };
};

Driver.findById = function (id, ...args) {
    if (mongoose.connection?.readyState === 1) {
        try {
            return origFindById(id, ...args);
        } catch (_) {}
    }
    const idStr = id?.toString();
    const driver = inMemoryFleet.get(idStr) || inMemoryFleet.get('672378901234567890123401');
    const wrapped = makeDoc(driver);
    return {
        ...wrapped,
        lean: () => Promise.resolve(driver ? { ...driver } : null),
        then: (resolve) => resolve(wrapped),
        catch: () => Promise.resolve(null),
    };
};

Driver.findOne = function (filter, ...args) {
    if (mongoose.connection?.readyState === 1) {
        try {
            return origFindOne(filter, ...args);
        } catch (_) {}
    }
    let match = null;
    if (filter?.phone) {
        for (const d of inMemoryFleet.values()) {
            if (d.phone === filter.phone.trim()) { match = d; break; }
        }
    } else if (filter?._id) {
        match = inMemoryFleet.get(filter._id.toString());
    }
    const wrapped = makeDoc(match);
    return {
        ...wrapped,
        lean: () => Promise.resolve(match ? { ...match } : null),
        then: (resolve) => resolve(wrapped),
        catch: () => Promise.resolve(null),
    };
};

Driver.find = function (filter, ...args) {
    if (mongoose.connection?.readyState === 1) {
        try {
            return origFind(filter, ...args);
        } catch (_) {}
    }
    let list = Array.from(inMemoryFleet.values());
    if (filter?.isOnline !== undefined) {
        list = list.filter((d) => Boolean(d.isOnline) === Boolean(filter.isOnline));
    }
    const wrappedList = list.map(makeDoc);
    const chain = {
        sort: () => chain,
        limit: () => chain,
        select: () => chain,
        lean: () => Promise.resolve(list.map((d) => ({ ...d }))),
        then: (resolve) => resolve(wrappedList),
        catch: () => Promise.resolve([]),
    };
    return chain;
};

Driver.create = function (data, ...args) {
    if (mongoose.connection?.readyState === 1) {
        try {
            return origCreate(data, ...args);
        } catch (_) {}
    }
    const id = new mongoose.Types.ObjectId();
    const doc = {
        _id: id,
        ...data,
        rating: 5.0,
        totalTrips: 0,
        tripsToday: 0,
        earningsToday: 0,
        isOnline: true,
        isBusy: false,
    };
    inMemoryFleet.set(id.toString(), doc);
    return Promise.resolve(makeDoc(doc));
};

Driver.updateOne = function (filter, update, options, ...args) {
    if (mongoose.connection?.readyState === 1) {
        try {
            return origUpdateOne(filter, update, options, ...args);
        } catch (_) {}
    }
    let target = null;
    if (filter?.phone) {
        for (const d of inMemoryFleet.values()) {
            if (d.phone === filter.phone) { target = d; break; }
        }
    }
    if (target && update?.$set) {
        Object.assign(target, update.$set);
    } else if (options?.upsert && update?.$set) {
        const id = new mongoose.Types.ObjectId();
        inMemoryFleet.set(id.toString(), { _id: id, ...update.$set });
    }
    return Promise.resolve({ acknowledged: true, modifiedCount: 1 });
};

Driver.countDocuments = function (...args) {
    if (mongoose.connection?.readyState === 1) {
        try {
            return origCount(...args);
        } catch (_) {}
    }
    return Promise.resolve(inMemoryFleet.size);
};

import mongoose from 'mongoose';

export const MERCHANT_CATEGORIES = [
    'Restaurant & Food',
    'Grocery & Supermarket',
    'Medical & Pharmacy',
    'Courier & Delivery',
    'Fashion & Lifestyle',
    'Electronics & Mobile',
    'Flowers & Gifts',
    'Other Services',
];

const pointSchema = new mongoose.Schema(
    {
        type: { type: String, enum: ['Point'], required: true, default: 'Point' },
        coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    { _id: false }
);

const merchantSchema = new mongoose.Schema(
    {
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        name: { type: String, required: [true, 'Store name is required'], trim: true, maxlength: 100 },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
        category: { type: String, required: true, enum: MERCHANT_CATEGORIES, index: true },
        description: { type: String, trim: true, maxlength: 500, default: '' },
        address: {
            street: { type: String, required: true, trim: true },
            area: { type: String, trim: true },
            city: { type: String, required: true, trim: true },
            state: { type: String, required: true, trim: true },
            pincode: { type: String, required: true, match: [/^[1-9][0-9]{5}$/, 'Invalid pincode'] },
        },
        location: { type: pointSchema, default: undefined },
        contact: {
            phone: { type: String, required: true },
            email: { type: String, lowercase: true, trim: true },
        },
        gstin: { type: String, uppercase: true, trim: true },
        fssai: { type: String, trim: true },
        openTime: { type: String, default: '09:00' }, // 24h HH:mm, IST
        closeTime: { type: String, default: '21:00' },
        closedDays: { type: [Number], default: [] }, // 0 = Sunday ... 6 = Saturday
        isOpen: { type: Boolean, default: true },
        status: { type: String, enum: ['active', 'suspended'], default: 'active' },
        ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
        ratingCount: { type: Number, default: 0, min: 0 },
        image: { type: String, default: '' },
        settings: {
            acceptingOrders: { type: Boolean, default: true },
            auraSupportEnabled: { type: Boolean, default: true },
            autoVoiceConfirmation: { type: Boolean, default: true },
        },
    },
    { timestamps: true }
);

merchantSchema.index({ ownerId: 1, status: 1 });
merchantSchema.index({ location: '2dsphere' });
merchantSchema.index({ name: 'text' }, { default_language: 'none' });

export const Merchant = mongoose.model('Merchant', merchantSchema);
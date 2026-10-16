import mongoose  from "mongoose";

const restaurantSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Restaurant name is required'],
            trim: true,
            index: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        cuisine: { type: [String], default: [] },
        address: {
            street: { type: String, default: '' },
            city: { type: String, default: 'Delhi' },
            pincode: { type: String, default: '110001' },
        },
        rating: { type: Number, default: 4.2, min: 1.0, max: 5.0 },
        deliveryTimeMins: { type: Number, default: 30 },
        isOpen: { type: Boolean, default: true },
        pricing: {
            minOrder: { type: Number, default: 99 },
            costForTwo: { type: Number, default: 350 },
        },
        image: { type: String, default: '' },
    },
    { timestamps: true }
);


const menuItemSchema = new mongoose.Schema(
    {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: [true, 'restaurantId is required'],
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Item name is required'],
            trim: true,
        },
        nameAliases: { type: [String], default: [], index: true },
        category: { type: String, required: true, trim: true },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
        },
        isVeg: { type: Boolean, default: false },
        isAvailable: { type: Boolean, default: true },
        description: { type: String, default: '' },
        image: { type: String, default: '' },
    },
    { timestamps: true }
);

menuItemSchema.index({ restaurantId: 1, isAvailable: 1 });
menuItemSchema.index({ name: 'text', nameAliases: 'text' });
export const Restaurant = mongoose.model('Restaurant', restaurantSchema);
export const MenuItem = mongoose.model('MenuItem', menuItemSchema);

import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
    {
        menuItemId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MenuItem',
            required: false,
            default: null,
        },
        name: {type: String, required: true },
        quantity: {type: Number, required: true},
        unitPrice: { type: Number, required: true},
        totalPrice: {type: Number, required: true},

    },
    {_id: false}
);

const orderSchema = new mongoose.Schema(
    {
        customerId: {
            type: String,
            required: [true, 'customerId is required'],
            index: true,
        },
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: false,
            default: null,
        },
        sessionId: { type: String, default: null },
        items: {
            type: [orderItemSchema],
            required: true,
            validate: [(arr) => arr.length > 0, 'Order must have at least one item'],
        },
        subtotal: { type: Number, required: true },
        deliveryFee: { type: Number, default: 30 },
        totalAmount: { type: Number, required: true },
        status: {
            type: String,
            enum: ['draft', 'confirmed', 'accepted', 'driver_assigned', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
            default: 'draft',
            index: true,
        },
        driver: {
            driverId: { type: String, default: null },
            name: { type: String, default: null },
            phone: { type: String, default: null },
            vehicle: { type: String, default: null },
            rating: { type: Number, default: 5.0 },
            avatar: { type: String, default: null },
            etaMinutes: { type: Number, default: 15 },
        },
        deliveryOtp: { type: String, default: '4821' },
        deliveryAddress: {
            street: { type: String, default: '' },
            city: { type: String, default: '' },
            pincode: { type: String, default: '' },
        },
        paymentMethod: {
            type: String,
            enum: ['cash_on_delivery'],
            default: 'cash_on_delivery',
        },
        confirmedAt: { type: Date, default: null },
        notes: { type: String, default: '' },
    },
    { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);

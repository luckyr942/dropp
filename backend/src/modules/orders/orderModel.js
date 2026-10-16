import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
    {
        menuItemId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MenuItem',
            required: true,
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
        customerId:{
            type: String,
            required: true,
            index: true,
            default: 'demo_cutomer_001',
        },
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: true,
        },
        sessionId: {type: String, default: true},
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
            enum: ['draft', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
            default: 'draft',
            index: true,
        },
        deliveryAddress: {
            street: { type: String, default: 'Demo Street, Sector 18' },
            city: { type: String, default: 'Delhi' },
            pincode: { type: String, default: '110001' },
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

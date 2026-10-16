import mongoose, { mongo } from 'mongoose';

const sessionSchema = new mongoose.Schema(
    {
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        customerId: {
            type: String,
            required: true,
            index: true,
        },
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
            default: null,
        },
        draftOrderId: { // The current working draft order before the customer commits
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null,
        },
        status: {
            type: String,
            enum: ['active', 'order_placed', 'abandoned'],
            default: 'active',
            index: true,
        },
        // Log of spoken phrases for QA, debugging misunderstandings, and improving speech recognition
        transcript: {
            type: [String],
            default: [],
        },
    },
    { timestamps: true }
);

// Auto-expire abandoned/stale sessions after 1 hour (3600 seconds)
sessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 3600 });

export const AuraSession = mongoose.model('AuraSession', sessionSchema);
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
        // Tracks where we are in the ordering flow
        // null → no pending action
        // 'awaiting_confirmation' → draft exists, waiting for "haan"
        stage: {
            type: String,
            enum: [null, 'awaiting_confirmation', 'awaiting_ride_confirmation', 'awaiting_multi_confirmation'],
            default: null,
        },

        // Server-side conversation history for Gemini
        // Each entry: { role: 'user'|'model', parts: [{ text: '...' }] }
        conversation: {
            type: [mongoose.Schema.Types.Mixed],
            default: [],
        },
        activeQuoteId: {
            type: String,
            default: null,
        },
        selectedRideType: {
            type: String,
            default: 'cab_economy',
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
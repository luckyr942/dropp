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

// In-Memory Fallback when MongoDB is offline / disconnected
const inMemorySessions = new Map();

const originalFindOne = AuraSession.findOne.bind(AuraSession);
const originalUpdateOne = AuraSession.updateOne.bind(AuraSession);
const originalFindOneAndUpdate = AuraSession.findOneAndUpdate.bind(AuraSession);

AuraSession.findOne = function (filter, ...args) {
    if (mongoose.connection?.readyState === 1) {
        try {
            return originalFindOne(filter, ...args);
        } catch (_) {}
    }
    const sessId = filter?.sessionId;
    const session = inMemorySessions.get(sessId) || null;
    return {
        lean: () => Promise.resolve(session ? { ...session } : null),
        then: (resolve) => resolve(session ? { ...session } : null),
        catch: () => Promise.resolve(null),
    };
};

AuraSession.updateOne = function (filter, update, ...args) {
    if (mongoose.connection?.readyState === 1) {
        try {
            return originalUpdateOne(filter, update, ...args);
        } catch (_) {}
    }
    const sessId = filter?.sessionId;
    let session = inMemorySessions.get(sessId);
    if (!session) {
        session = { sessionId: sessId, conversation: [], transcript: [], status: 'active', customerId: 'cust_live_001' };
        inMemorySessions.set(sessId, session);
    }
    if (update?.$set) Object.assign(session, update.$set);
    if (update?.$push?.conversation) {
        session.conversation = session.conversation || [];
        session.conversation.push(update.$push.conversation);
    }
    if (update?.$push?.transcript) {
        session.transcript = session.transcript || [];
        session.transcript.push(update.$push.transcript);
    }
    return Promise.resolve({ acknowledged: true, modifiedCount: 1 });
};

AuraSession.findOneAndUpdate = function (filter, update, options, ...args) {
    if (mongoose.connection?.readyState === 1) {
        try {
            return originalFindOneAndUpdate(filter, update, options, ...args);
        } catch (_) {}
    }
    const sessId = filter?.sessionId;
    let session = inMemorySessions.get(sessId);
    if (!session) {
        session = { sessionId: sessId, conversation: [], transcript: [], status: 'active', customerId: 'cust_live_001' };
        inMemorySessions.set(sessId, session);
    }
    if (update?.$set) Object.assign(session, update.$set);
    return {
        lean: () => Promise.resolve({ ...session }),
        then: (resolve) => resolve({ ...session }),
        catch: () => Promise.resolve(null),
    };
};
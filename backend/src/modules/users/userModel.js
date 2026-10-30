import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 80 },
        phone: { type: String, required: true, unique: true, trim: true },
        email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
        passwordHash: { type: String, required: true, select: false },
        role: { type: String, enum: ['merchant', 'customer', 'admin'], default: 'merchant' },
        isActive: { type: Boolean, default: true },
        lastLoginAt: Date,
        refreshTokens: {
            type: [{ tokenHash: String, expiresAt: Date, createdAt: { type: Date, default: Date.now }, _id: false }],
            select: false,
            default: [],
        },
    },
    { timestamps: true }
);

userSchema.index({ 'refreshTokens.tokenHash': 1 });

export const User = mongoose.model('User', userSchema);
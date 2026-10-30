import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../users/userModel.js';
import { httpError } from '../../utils/asyncHandler.js';
import { normalizeIndianPhone } from '../../utils/phone.js';

const ACCESS_TTL = '15m';
const REFRESH_DAYS = 30;
const MAX_SESSIONS = 5;
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const publicUser = (u) => ({ id: u._id.toString(), name: u.name, phone: u.phone, email: u.email, role: u.role });

function signAccess(user) {
    return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_ACCESS_SECRET, {
        expiresIn: ACCESS_TTL,
    });
}

async function startSession(user) {
    const refreshToken = crypto.randomBytes(48).toString('hex');
    await User.updateOne(
        { _id: user._id },
        {
            $set: { lastLoginAt: new Date() },
            $push: {
                refreshTokens: {
                    $each: [{ tokenHash: sha256(refreshToken), expiresAt: new Date(Date.now() + REFRESH_DAYS * 864e5) }],
                    $slice: -MAX_SESSIONS,
                },
            },
        }
    );
    return { user: publicUser(user), accessToken: signAccess(user), refreshToken };
}

export async function register({ name, phone, email, password, role }) {
    const passwordHash = await bcrypt.hash(password, 12);
    let user;
    try {
        user = await User.create({ name, phone, email, passwordHash, role });
    } catch (err) {
        if (err.code === 11000) throw httpError(409, 'An account with this phone or email already exists');
        throw err;
    }
    return startSession(user);
}

export async function login({ identifier, password }) {
    const query = identifier.includes('@')
        ? { email: identifier.toLowerCase() }
        : (() => {
              const phone = normalizeIndianPhone(identifier);
              return phone ? { phone } : null;
          })();

    const user = query ? await User.findOne(query).select('+passwordHash') : null;
    const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
    if (!user || !ok || !user.isActive) throw httpError(401, 'Incorrect phone/email or password');
    return startSession(user);
}

export async function refresh(refreshToken) {
    const tokenHash = sha256(refreshToken);
    const user = await User.findOne({ 'refreshTokens.tokenHash': tokenHash }).select('+refreshTokens');
    const entry = user?.refreshTokens.find((t) => t.tokenHash === tokenHash);
    if (!user || !entry || entry.expiresAt < new Date() || !user.isActive) {
        throw httpError(401, 'Session expired. Please log in again.');
    }
    await User.updateOne({ _id: user._id }, { $pull: { refreshTokens: { tokenHash } } });
    return startSession(user);
}

export async function logout(refreshToken) {
    await User.updateOne(
        { 'refreshTokens.tokenHash': sha256(refreshToken) },
        { $pull: { refreshTokens: { tokenHash: sha256(refreshToken) } } }
    );
}

export async function getMe(userId) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) throw httpError(401, 'Account not found');
    return publicUser(user);
}
import jwt from 'jsonwebtoken';
import { httpError } from '../utils/asyncHandler.js';

export function requireAuth(req, res, next) {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return next(httpError(401, 'Authentication required'));
    try {
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = { id: payload.sub, role: payload.role };
        next();
    } catch {
        next(httpError(401, 'Invalid or expired token'));
    }
}

export const requireRole = (...roles) => (req, res, next) =>
    roles.includes(req.user?.role) ? next() : next(httpError(403, 'You do not have access to this resource'));
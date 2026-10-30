import * as auth from './authService.js';
import { wrap } from '../../utils/asyncHandler.js';

export const register = wrap(async (req, res) => {
    res.status(201).json({ success: true, data: await auth.register(req.valid.body) });
});

export const login = wrap(async (req, res) => {
    res.json({ success: true, data: await auth.login(req.valid.body) });
});

export const refresh = wrap(async (req, res) => {
    res.json({ success: true, data: await auth.refresh(req.valid.body.refreshToken) });
});

export const logout = wrap(async (req, res) => {
    await auth.logout(req.valid.body.refreshToken);
    res.json({ success: true });
});

export const me = wrap(async (req, res) => {
    res.json({ success: true, data: await auth.getMe(req.user.id) });
});
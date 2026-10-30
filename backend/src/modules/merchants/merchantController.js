import { createMerchant, listMyMerchants, updateMerchant, getMerchantDashboard } from './merchantService.js';
import { wrap } from '../../utils/asyncHandler.js';

export const create = wrap(async (req, res) => {
    res.status(201).json({ success: true, data: await createMerchant(req.user.id, req.valid.body) });
});

export const listMine = wrap(async (req, res) => {
    res.json({ success: true, data: await listMyMerchants(req.user.id) });
});

export const getOne = wrap(async (req, res) => {
    res.json({ success: true, data: req.merchant });
});

export const dashboard = wrap(async (req, res) => {
    res.json({ success: true, data: await getMerchantDashboard(req.merchant) });
});

export const update = wrap(async (req, res) => {
    res.json({ success: true, data: await updateMerchant(req.merchant._id, req.valid.body) });
});
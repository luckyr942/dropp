import { createMerchant, listMyMerchants, updateMerchant, getMerchantDashboard } from './merchantService.js';
import { listMerchantOrders, setMerchantOrderStatus, getMerchantAnalytics } from './merchantOrderService.js';
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
export const listOrders = wrap(async (req, res) => {
    res.json({ success: true, data: await listMerchantOrders(req.merchant, req.valid.query) });
});

export const updateOrderStatus = wrap(async (req, res) => {
    res.json({
        success: true,
        data: await setMerchantOrderStatus(req.merchant, req.params.orderId, req.valid.body.status),
    });
});

export const analytics = wrap(async (req, res) => {
    res.json({ success: true, data: await getMerchantAnalytics(req.merchant, req.valid.query) });
});

import { getOwnedMerchant } from './merchantService.js';

export async function loadOwnedMerchant(req, res, next) {
    try {
        req.merchant = await getOwnedMerchant(req.params.merchantId, req.user.id);
        next();
    } catch (err) {
        next(err);
    }
}
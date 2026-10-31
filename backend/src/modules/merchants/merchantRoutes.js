import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { loadOwnedMerchant } from './loadOwnedMerchant.js';
import {
    createMerchantSchema,
    updateMerchantSchema,
    listMerchantOrdersQuerySchema,
    merchantOrderStatusSchema,
    analyticsQuerySchema,
} from './merchantSchemas.js';
import * as c from './merchantController.js';

const router = Router();
router.use(requireAuth, requireRole('merchant'));

router.post('/', validate(createMerchantSchema), c.create);
router.get('/mine', c.listMine); 
router.get('/:merchantId', loadOwnedMerchant, c.getOne);
router.get('/:merchantId/dashboard', loadOwnedMerchant, c.dashboard);
router.patch('/:merchantId', loadOwnedMerchant, validate(updateMerchantSchema), c.update);

// Seller order feed + actions
router.get('/:merchantId/orders', loadOwnedMerchant, validate(listMerchantOrdersQuerySchema, 'query'), c.listOrders);
router.patch(
    '/:merchantId/orders/:orderId/status',
    loadOwnedMerchant,
    validate(merchantOrderStatusSchema),
    c.updateOrderStatus
);
router.get('/:merchantId/analytics', loadOwnedMerchant, validate(analyticsQuerySchema, 'query'), c.analytics);

export default router;
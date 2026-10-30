import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { loadOwnedMerchant } from '../merchants/loadOwnedMerchant.js';
import {
    createProductSchema,
    updateProductSchema,
    availabilitySchema,
    stockAdjustSchema,
    listProductsQuerySchema,
} from './productSchemas.js';
import * as c from './productController.js';

const router = Router({ mergeParams: true });
router.use(requireAuth, requireRole('merchant'), loadOwnedMerchant); // Every product route is ownership-verified

router.post('/', validate(createProductSchema), c.add);
router.get('/', validate(listProductsQuerySchema, 'query'), c.list);
router.patch('/:productId', validate(updateProductSchema), c.update);
router.patch('/:productId/availability', validate(availabilitySchema), c.availability);
router.post('/:productId/stock', validate(stockAdjustSchema), c.stock);

export default router;
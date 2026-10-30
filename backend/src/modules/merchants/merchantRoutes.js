import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { loadOwnedMerchant } from './loadOwnedMerchant.js';
import { createMerchantSchema, updateMerchantSchema } from './merchantSchemas.js';
import * as c from './merchantController.js';

const router = Router();
router.use(requireAuth, requireRole('merchant'));

router.post('/', validate(createMerchantSchema), c.create);
router.get('/mine', c.listMine); 
router.get('/:merchantId', loadOwnedMerchant, c.getOne);
router.get('/:merchantId/dashboard', loadOwnedMerchant, c.dashboard);
router.patch('/:merchantId', loadOwnedMerchant, validate(updateMerchantSchema), c.update);

export default router;
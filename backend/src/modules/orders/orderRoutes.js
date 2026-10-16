import {Router} from 'express';
import {
  handleCreateDraft,
  handleGetOrders,
  handleGetOrder,
  handleConfirmOrder,
  handleCancelOrder,
} from './orderController.js';

const router = Router();
router.post('/draft', handleCreateDraft);
router.get('/', handleGetOrders);
router.get('/:id', handleGetOrder);
router.post('/:id/confirm', handleConfirmOrder);
router.post('/:id/cancel', handleCancelOrder);

export default router;
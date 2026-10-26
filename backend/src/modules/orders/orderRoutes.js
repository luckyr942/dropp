import {Router} from 'express';
import {
  handleCreateDraft,
  handleGetOrders,
  handleGetOrder,
  handleConfirmOrder,
  handleCancelOrder,
  handleUpdateOrderStatus,
  handleGetOperationsOrders,
} from './orderController.js';
import { config } from '../../config/config.js';

const router = Router();
const requireOperationsKey = (req, res, next) => {
  if (!config.operationsKey || req.get('x-operations-key') !== config.operationsKey) {
    return res.status(401).json({ success: false, error: 'Operations authorization required' });
  }
  next();
};

router.post('/draft', handleCreateDraft);
router.get('/operations', requireOperationsKey, handleGetOperationsOrders);
router.patch('/:id/status', requireOperationsKey, handleUpdateOrderStatus);
router.get('/', handleGetOrders);
router.get('/:id', handleGetOrder);
router.post('/:id/confirm', handleConfirmOrder);
router.post('/:id/cancel', handleCancelOrder);

export default router;

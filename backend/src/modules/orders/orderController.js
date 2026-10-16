import {
  createDraftOrder,
  getOrderById,
  getOrdersForCustomer,
  confirmOrder,
  cancelOrder,
} from './orderService.js';

export async function handleCreateDraft(req, res, next) {
  try {
    const { restaurantId, sessionId, items } = req.body;
    if (!restaurantId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'restaurantId and items[] are required',
      });
    }
    const order = await createDraftOrder({ restaurantId, sessionId, items });
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function handleGetOrders(req, res, next) {
  try {
    const orders = await getOrdersForCustomer('demo_customer_001');
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

export async function handleGetOrder(req, res, next) {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function handleConfirmOrder(req, res, next) {
  try {
    const order = await confirmOrder(req.params.id);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function handleCancelOrder(req, res, next) {
  try {
    const order = await cancelOrder(req.params.id);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

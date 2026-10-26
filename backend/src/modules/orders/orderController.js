import {
  createDraftOrder,
  getOrderById,
  getOrdersForCustomer,
  getOrdersForOperations,
  confirmOrder,
  cancelOrder,
  updateOrderStatus,
} from './orderService.js';

export async function handleCreateDraft(req, res, next) {
  try {
    const { restaurantId, sessionId, items, customerId, orderType, deliveryAddress, restaurantName } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items[] array is required',
      });
    }
    const realCustomerId = req.user?.id || req.headers['x-customer-id'] || customerId;
    const order = await createDraftOrder({
      restaurantId,
      sessionId,
      items,
      customerId: realCustomerId,
      orderType,
      deliveryAddress,
      restaurantName,
    });
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function handleGetOrders(req, res, next) {
  try {
    const realCustomerId = req.user?.id || req.headers['x-customer-id'] || req.query.customerId;
    const orders = await getOrdersForCustomer(realCustomerId);
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

export async function handleGetOperationsOrders(req, res, next) {
  try {
    const orders = await getOrdersForOperations();
    res.json({ success: true, data: orders });
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

export async function handleUpdateOrderStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required in request body' });
    }
    const result = await updateOrderStatus(req.params.id, status);
    res.json(result);
  } catch (err) {
    next(err);
  }
}


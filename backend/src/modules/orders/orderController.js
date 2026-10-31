import {
  createDraftOrder,
  getOrderById,
  getOrdersForCustomer,
  getOrdersForOperations,
  confirmOrder,
  cancelOrder,
  updateOrderStatus,
} from './orderService.js';

// Identity of the calling customer: JWT user, else the device-bound x-customer-id header
const callerCustomerId = (req) => req.user?.id || req.headers['x-customer-id'] || null;

export async function handleCreateDraft(req, res, next) {
  try {
    const { restaurantId, sessionId, items, customerId, orderType, deliveryAddress, restaurantName } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items[] array is required',
      });
    }
    const realCustomerId = callerCustomerId(req) || customerId;
    const order = await createDraftOrder({
      restaurantId,
      sessionId,
      items,
      customerId: realCustomerId,
      orderType,
      deliveryAddress,
      restaurantName,
      // Client requests must reference real catalog items; prices are computed server-side
      requireCatalogItems: true,
    });
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function handleGetOrders(req, res, next) {
  try {
    const realCustomerId = callerCustomerId(req) || req.query.customerId;
    if (!realCustomerId) {
      return res.status(400).json({ success: false, error: 'x-customer-id header is required' });
    }
    const orders = await getOrdersForCustomer(realCustomerId, {
      status: req.query.status,
      limit: req.query.limit,
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

export async function handleGetOrder(req, res, next) {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const order = await getOrderById(req.params.id);
    // Not scoped to the caller: Aura-created orders may carry a different customer id
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
    const order = await cancelOrder(req.params.id, callerCustomerId(req) || req.body?.customerId || null);
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


import { Order } from './orderModel.js';
import { publishDomainEvent } from '../../infrastructure/rabbitmq/index.js';
import { broadcast, emitToCustomer, emitToDashboard, emitToMerchant } from '../../infrastructure/websocket/wsServer.js';
import { config } from '../../config/config.js';
import { MenuItem, Restaurant } from '../catalog/catalogModel.js';

const DELIVERY_FEE = 30;

const isValidMongoId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
const badRequest = (message, status = 400) => Object.assign(new Error(message), { status });

function normaliseQuantity(q) {
  const n = Math.floor(Number(q));
  if (!Number.isFinite(n) || n < 1) throw badRequest('Each item needs a quantity of at least 1');
  if (n > 50) throw badRequest('Quantity per item cannot exceed 50');
  return n;
}

function normaliseAddress(addr) {
  if (!addr) return { street: '', city: '', pincode: '' };
  if (typeof addr === 'string') return { street: addr.trim().slice(0, 200), city: '', pincode: '' };
  return {
    street: String(addr.street || addr.address || '').trim().slice(0, 200),
    city: String(addr.city || '').trim().slice(0, 80),
    pincode: String(addr.pincode || '').trim().slice(0, 12),
  };
}

/**
 * Create a draft order.
 *
 * Items that carry a real `menuItemId` are always priced server-side from the
 * MenuItem collection (client prices are ignored) and must belong to one
 * restaurant. Items without a menuItemId are only accepted from trusted
 * internal callers (e.g. Aura, which resolves names to catalog prices itself);
 * pass `requireCatalogItems: true` for any request coming from a client.
 */
export async function createDraftOrder(payload, customerId) {
  const {
    restaurantId,
    sessionId,
    items,
    orderType = 'FOOD',
    deliveryAddress,
    restaurantName,
    requireCatalogItems = false,
  } = payload;

  if (!Array.isArray(items) || items.length === 0) throw badRequest('items[] array is required');
  if (restaurantId && !isValidMongoId(String(restaurantId)) && requireCatalogItems) {
    throw badRequest('restaurantId is not a valid id');
  }

  const effectiveCustomerId = payload.customerId || customerId || config.defaultCustomerId;
  const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

  // Look up every referenced catalog item in one query
  const catalogIds = items.map((i) => i?.menuItemId && String(i.menuItemId)).filter(isValidMongoId);
  const menuDocs = catalogIds.length
    ? await MenuItem.find({ _id: { $in: catalogIds } }).lean()
    : [];
  const menuById = new Map(menuDocs.map((m) => [String(m._id), m]));

  let resolvedRestaurantId = isValidMongoId(String(restaurantId || '')) ? String(restaurantId) : null;

  const orderItems = items.map((i) => {
    const quantity = normaliseQuantity(i?.quantity ?? 1);
    const id = i?.menuItemId ? String(i.menuItemId) : null;

    if (id && isValidMongoId(id)) {
      const menuItem = menuById.get(id);
      if (!menuItem) throw badRequest(`Menu item ${id} was not found`, 404);
      if (!menuItem.isAvailable) throw badRequest(`${menuItem.name} is currently unavailable`, 409);
      const itemRestaurantId = String(menuItem.restaurantId);
      if (resolvedRestaurantId && resolvedRestaurantId !== itemRestaurantId) {
        throw badRequest('All items in an order must come from the same restaurant');
      }
      resolvedRestaurantId = itemRestaurantId;
      return {
        menuItemId: menuItem._id,
        name: menuItem.name,
        quantity,
        unitPrice: menuItem.price,
        totalPrice: menuItem.price * quantity,
      };
    }

    if (requireCatalogItems) {
      throw badRequest('Every item needs a valid menuItemId');
    }

    // Trusted internal caller (already resolved against the catalog)
    const unitPrice = Number(i.unitPrice ?? i.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw badRequest(`Item "${i?.name || 'unknown'}" has no price`);
    }
    return {
      menuItemId: null,
      name: String(i.name || 'Item'),
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
    };
  });

  let restaurantDoc = null;
  if (resolvedRestaurantId) {
    restaurantDoc = await Restaurant.findById(resolvedRestaurantId).select('name isOpen').lean();
    if (!restaurantDoc && requireCatalogItems) throw badRequest('Restaurant not found', 404);
    if (restaurantDoc && restaurantDoc.isOpen === false && requireCatalogItems) {
      throw badRequest(`${restaurantDoc.name} is not accepting orders right now`, 409);
    }
  }

  const address = normaliseAddress(deliveryAddress);
  if (requireCatalogItems && !address.street) {
    throw badRequest('A delivery address is required');
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = DELIVERY_FEE;
  const totalAmount = subtotal + deliveryFee;
  const displayName = restaurantDoc?.name || restaurantName;

  const order = await Order.create({
    customerId: effectiveCustomerId,
    restaurantId: restaurantDoc ? restaurantDoc._id : (resolvedRestaurantId || null),
    sessionId: sessionId || null,
    items: orderItems,
    subtotal,
    deliveryFee,
    totalAmount,
    status: 'draft',
    deliveryOtp,
    deliveryAddress: address,
    notes: displayName ? `From ${displayName}` : (orderType === 'SHOP' ? 'From Local Mart' : ''),
  });

  const created = order.toObject();
  if (restaurantDoc) created.restaurantName = restaurantDoc.name;
  return created;
}

export async function updateDraftOrder(orderId, items) {
  const order = await Order.findById(orderId);

  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  if (order.status !== 'draft') {
    throw Object.assign(
      new Error(`Cannot edit order in status: ${order.status}`),
      { status: 400 }
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = DELIVERY_FEE;

  order.items = items;
  order.subtotal = subtotal;
  order.deliveryFee = deliveryFee;
  order.totalAmount = subtotal + deliveryFee;

  await order.save();
  return order.toObject();
}

export async function getOrderById(orderId) {
  return Order.findById(orderId).populate('restaurantId', 'name slug').lean();
}

export async function getOrdersForCustomer(customerId = null, { status, limit } = {}) {
  // Never fall back to another customer's orders when the caller is unknown
  if (!customerId) return [];
  const query = { customerId };
  if (status) {
    const statuses = String(status).split(',').map((x) => x.trim()).filter(Boolean);
    if (statuses.length) query.status = { $in: statuses };
  } else {
    // Abandoned carts are not orders from the customer's point of view
    query.status = { $ne: 'draft' };
  }
  const max = Math.min(Math.max(Number(limit) || 50, 1), 100);
  return Order.find(query)
    .populate('restaurantId', 'name slug image')
    .sort({ createdAt: -1 })
    .limit(max)
    .lean();
}

export async function confirmOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
  if (order.status !== 'draft') {
    throw Object.assign(
      new Error(`Order is already ${order.status} - cannot confirm`),
      { status: 400 }
    );
  }

  order.status = 'confirmed';
  order.confirmedAt = new Date();
  await order.save();

  await publishDomainEvent({
    eventType: 'order.confirmed',
    eventId: `order-confirmed-${order._id}-${order.confirmedAt.getTime()}`,
    aggregateId: order._id.toString(),
    orderId: order._id.toString(),
    restaurantId: order.restaurantId ? order.restaurantId.toString() : null,
    customerId: order.customerId,
    totalAmount: order.totalAmount,
    confirmedAt: order.confirmedAt,
  });

  // Notify customer's socket
  emitToCustomer(order.customerId, 'ORDER_CONFIRMED', {
    orderId: order._id.toString(),
    status: 'confirmed',
    totalAmount: order.totalAmount,
  });

  // Notify dashboard / restaurant panel
  emitToDashboard('DASHBOARD_ORDER_UPDATE', {
    orderId: order._id.toString(),
    status: 'confirmed',
    totalAmount: order.totalAmount,
  });

  // Notify the seller app's merchant room (no-op if no store is attached)
  emitToMerchant(order.merchantId || order.restaurantId, 'merchant.new_order', {
    orderId: order._id.toString(),
    status: 'confirmed',
    totalAmount: order.totalAmount,
    itemsCount: order.items?.length || 0,
  });

  try {
    const { setLatestDriverOffer } = await import('../rides/rideService.js');
    const { pushOffer } = await import('../../infrastructure/offerQueue.js');
    const populated = await Order.findById(order._id).populate('restaurantId', 'name address location').lean();
    const isShop = order.notes?.toLowerCase().includes('shop') || order.notes?.toLowerCase().includes('mart');
    const pickupName = populated?.restaurantId?.name || order.notes?.replace(/^From /, '') || (isShop ? 'Store pickup' : 'Restaurant pickup');
    const destName = [order.deliveryAddress?.street, order.deliveryAddress?.city].filter(Boolean).join(', ') || 'Customer address';

    const driverOffer = {
      offerId: order._id.toString(),
      serviceType: isShop ? 'SHOPPING DELIVERY' : 'FOOD DELIVERY',
      title: isShop ? 'NEW SHOP / GROCERY PICKUP' : 'NEW FOOD ORDER PICKUP',
      fare: `₹${Math.round(order.totalAmount * 0.25) || 65}`,
      fareNumber: Math.round(order.totalAmount * 0.25) || 65,
      distance: `${order.items?.length || 1} item${(order.items?.length || 1) > 1 ? 's' : ''} • ₹${order.totalAmount}`,
      pickup: pickupName,
      destination: destName,
      // No OTP here: offers go to every driver; the customer shares it at handover
      totalAmount: order.totalAmount,
      itemsCount: order.items?.length || 2,
      createdAt: new Date().toISOString(),
    };
    pushOffer(driverOffer);
    setLatestDriverOffer(driverOffer);
    broadcast('driver.incoming_offer', driverOffer);
  } catch(_) {}

  return order.toObject();
}

const CUSTOMER_CANCELLABLE = ['draft', 'confirmed', 'accepted'];

/**
 * Cancel an order. When `customerId` is given (customer-initiated), the order
 * must belong to that customer. Internal callers (Aura) may omit it.
 */
export async function cancelOrder(orderId, customerId = null) {
  if (!isValidMongoId(String(orderId || ''))) throw badRequest('Order not found', 404);
  const order = await Order.findById(orderId);
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
  // Customer-initiated cancels must come from the order's owner. Orders placed under the
  // shared default identity (e.g. Aura sessions without a device id) stay cancellable.
  if (customerId && order.customerId !== customerId && order.customerId !== config.defaultCustomerId) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }
  if (order.status === 'cancelled') return order.toObject();
  if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
    throw Object.assign(
      new Error(
        order.status === 'delivered'
          ? 'This order has already been delivered'
          : 'Your order is already being prepared or on its way and can no longer be cancelled'
      ),
      { status: 409 }
    );
  }

  order.status = 'cancelled';
  await order.save();

  const payload = {
    orderId: order._id.toString(),
    status: 'cancelled',
    updatedAt: order.updatedAt,
  };
  emitToCustomer(order.customerId, 'ORDER_CANCELLED', payload);
  emitToDashboard('DASHBOARD_ORDER_UPDATE', payload);
  // Let any driver who still has this offer on screen drop it
  broadcast('order.cancelled', { orderId: payload.orderId });

  return order.toObject();
}

/**
 * Advance an order's status (for the restaurant / operations dashboard)
 * Emits live event to the customer's phone and the dashboard.
 */
export async function updateOrderStatus(orderId, newStatus) {
  const allowed = ['draft', 'confirmed', 'accepted', 'driver_assigned', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!allowed.includes(newStatus)) {
    throw Object.assign(new Error(`Invalid order status: ${newStatus}`), { status: 400 });
  }

  const order = await Order.findById(orderId).populate('restaurantId', 'name address');
  if (!order) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }

  const nextStatuses = {
    draft: ['confirmed', 'cancelled'],
    confirmed: ['accepted', 'cancelled'],
    accepted: ['preparing', 'cancelled'],
    driver_assigned: ['preparing', 'ready_for_pickup', 'out_for_delivery', 'cancelled'],
    preparing: ['ready_for_pickup', 'out_for_delivery', 'cancelled'],
    ready_for_pickup: ['out_for_delivery', 'cancelled'],
    out_for_delivery: ['delivered'],
    delivered: [],
    cancelled: [],
  };
  if (order.status !== newStatus && !nextStatuses[order.status]?.includes(newStatus)) {
    throw Object.assign(
      new Error(`Cannot change an order from ${order.status} to ${newStatus}`),
      { status: 409 }
    );
  }

  order.status = newStatus;
  await order.save();

  const restaurantName = order.restaurantId?.name || 'Restaurant';
  const spokenMessage =
    newStatus === 'accepted'
      ? `${restaurantName} ne aapka order accept kar liya hai.`
      : newStatus === 'preparing'
      ? `${restaurantName} mein aapka khana prepare ho raha hai.`
      : newStatus === 'out_for_delivery'
      ? `Aapka order delivery ke liye nikal chuka hai.`
      : newStatus === 'delivered'
      ? `Aapka order deliver ho gaya hai. Enjoy your meal!`
      : `Order status update: ${newStatus}`;

  // Emit directly to customer socket
  emitToCustomer(order.customerId, 'ORDER_STATUS_UPDATE', {
    orderId: order._id.toString(),
    status: order.status,
    restaurantName,
    message: spokenMessage,
    updatedAt: new Date().toISOString(),
  });

  // Also broadcast to admin/restaurant dashboard
  emitToDashboard('DASHBOARD_ORDER_UPDATE', {
    orderId: order._id.toString(),
    status: order.status,
    updatedAt: new Date().toISOString(),
  });

  // Notify the seller app's merchant room (restaurantId is populated above, so use the raw id)
  emitToMerchant(order.merchantId || order.populated('restaurantId') || order.restaurantId?._id, 'ORDER_STATUS_UPDATE', {
    orderId: order._id.toString(),
    status: order.status,
    updatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    orderId: order._id.toString(),
    status: order.status,
    restaurantName,
    message: spokenMessage,
  };
}

export async function getOrdersForOperations() {
  return Order.find({})
    .populate('restaurantId', 'name slug')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Retrieve the latest active order for a customer or session (used by Aura brain)
 */
export async function getLatestActiveOrder(identifier) {
  if (!identifier) return null;
  // Look up by customerId or sessionId
  const order = await Order.findOne({
    $or: [{ customerId: identifier }, { sessionId: identifier }],
    status: { $in: ['confirmed', 'accepted', 'driver_assigned', 'preparing', 'out_for_delivery'] },
  })
    .sort({ createdAt: -1 })
    .populate('restaurantId', 'name')
    .lean();

  return order;
}


import { Order } from './orderModel.js';
import { publishDomainEvent } from '../../infrastructure/rabbitmq/index.js';
import { broadcast, emitToCustomer, emitToDashboard } from '../../infrastructure/websocket/wsServer.js';
import { config } from '../../config/config.js';

const DELIVERY_FEE = 30;

export async function createDraftOrder(payload, customerId) {
  const { restaurantId, sessionId, items, orderType = 'FOOD', deliveryAddress, restaurantName } = payload;
  const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || (item.price * item.quantity)), 0);
  const deliveryFee = DELIVERY_FEE;
  const totalAmount = subtotal + deliveryFee;
  const effectiveCustomerId = payload.customerId || customerId || config.defaultCustomerId;
  const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

  const isValidMongoId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
  const safeRestaurantId = isValidMongoId(restaurantId) ? restaurantId : '650c1f1e1c9d440000a11111';

  const order = await Order.create({
    customerId: effectiveCustomerId,
    restaurantId: safeRestaurantId,
    sessionId: sessionId || null,
    items: items.map(i => ({
      menuItemId: isValidMongoId(i.menuItemId) ? i.menuItemId : '650c1f1e1c9d440000b11111',
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice || i.price || 100,
      totalPrice: i.totalPrice || ((i.price || 100) * i.quantity),
    })),
    subtotal,
    deliveryFee,
    totalAmount,
    status: 'draft',
    deliveryOtp,
    deliveryAddress: deliveryAddress || {
      street: 'Flat 402, Tower B, Sector 28',
      city: 'Gurugram',
      pincode: '122002',
    },
    notes: restaurantName ? `From ${restaurantName}` : (orderType === 'SHOP' ? 'From Local Mart' : ''),
  });

  return order.toObject();
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

export async function getOrdersForCustomer(customerId = null) {
  const targetCustomerId = customerId || config.defaultCustomerId;
  return Order.find({ customerId: targetCustomerId })
    .populate('restaurantId', 'name slug')
    .sort({ createdAt: -1 })
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

  try {
    const { setLatestDriverOffer } = await import('../rides/rideService.js');
    const { pushOffer } = await import('../../infrastructure/offerQueue.js');
    const populated = await Order.findById(order._id).populate('restaurantId', 'name address location').lean();
    const isShop = order.notes?.toLowerCase().includes('shop') || order.notes?.toLowerCase().includes('mart');
    const pickupName = populated?.restaurantId?.name || order.notes?.replace(/^From /, '') || (isShop ? 'Zepto / Blinkit Local Mart, Sector 28' : 'The Daily Grind, Sector 28');
    const destName = order.deliveryAddress?.street ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city || 'Gurugram'}` : 'Flat 402, Tower B, Sector 28, Gurugram';

    const driverOffer = {
      offerId: order._id.toString(),
      serviceType: isShop ? 'SHOPPING DELIVERY' : 'FOOD DELIVERY',
      title: isShop ? 'NEW SHOP / GROCERY PICKUP' : 'NEW FOOD ORDER PICKUP',
      fare: `₹${Math.round(order.totalAmount * 0.25) || 65}`,
      fareNumber: Math.round(order.totalAmount * 0.25) || 65,
      distance: '3.6 km • 16 mins',
      pickup: pickupName,
      destination: destName,
      otp: order.deliveryOtp || '4821',
      customerName: 'Customer',
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

export async function cancelOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
  if (!['draft', 'confirmed'].includes(order.status)) {
    throw Object.assign(
      new Error(`Cannot cancel order in status: ${order.status}`),
      { status: 400 }
    );
  }

  order.status = 'cancelled';
  await order.save();

  emitToCustomer(order.customerId, 'ORDER_CANCELLED', {
    orderId: order._id.toString(),
    status: 'cancelled',
  });

  emitToDashboard('DASHBOARD_ORDER_UPDATE', {
    orderId: order._id.toString(),
    status: 'cancelled',
  });

  return order.toObject();
}

/**
 * Advance an order's status (for the restaurant / operations dashboard)
 * Emits live event to the customer's phone and the dashboard.
 */
export async function updateOrderStatus(orderId, newStatus) {
  const allowed = ['draft', 'confirmed', 'accepted', 'driver_assigned', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
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
    driver_assigned: ['preparing', 'out_for_delivery', 'cancelled'],
    preparing: ['out_for_delivery', 'cancelled'],
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


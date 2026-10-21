import { Order } from './orderModel.js';
import { publishDomainEvent } from '../../infrastructure/rabbitmq/index.js';
import { broadcast } from '../../infrastructure/websocket/wsServer.js';
import { config } from '../../config/config.js';

const DELIVERY_FEE = 30;

export async function createDraftOrder(payload, customerId) {
  const { restaurantId, sessionId, items } = payload;
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = DELIVERY_FEE;
  const totalAmount = subtotal + deliveryFee;
  const effectiveCustomerId = payload.customerId || customerId || config.defaultCustomerId;

  const order = await Order.create({
    customerId: effectiveCustomerId,
    restaurantId,
    sessionId: sessionId || null,
    items,
    subtotal,
    deliveryFee,
    totalAmount,
    status: 'draft',
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

  await publishDomainEvent('order.confirmed', {
    orderId: order._id.toString(),
    restaurantId: order.restaurantId.toString(),
    customerId: order.customerId,
    totalAmount: order.totalAmount,
    confirmedAt: order.confirmedAt,
  });

  broadcast('ORDER_CONFIRMED', {
    orderId: order._id.toString(),
    status: 'confirmed',
    totalAmount: order.totalAmount,
  });

  try {
    const { setLatestDriverOffer } = await import('../rides/rideService.js');
    const driverOffer = {
      offerId: order._id.toString(),
      serviceType: 'FOOD DELIVERY',
      title: 'NEW FOOD ORDER PICKUP',
      fare: `₹${Math.round(order.totalAmount * 0.25) || 65}`,
      fareNumber: Math.round(order.totalAmount * 0.25) || 65,
      distance: '3.6 km • 16 mins',
      pickup: 'Bawarchee Biryani House, Sector 28',
      destination: 'Cyber Hub Building 10, Gurugram',
      otp: '4821',
      customerName: 'Rahul Verma',
      totalAmount: order.totalAmount,
      itemsCount: order.items?.length || 2,
      createdAt: new Date().toISOString(),
    };
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

  broadcast('ORDER_CANCELLED', {
    orderId: order._id.toString(),
    status: 'cancelled',
  });

  return order.toObject();
}

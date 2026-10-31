import mongoose from 'mongoose';
import { Order } from '../orders/orderModel.js';
import { updateOrderStatus } from '../orders/orderService.js';
import { httpError } from '../../utils/asyncHandler.js';

// Seller-facing order buckets. Drafts (cart not yet placed) are never shown to sellers.
export const ORDER_BUCKETS = {
    ongoing: ['confirmed', 'accepted', 'driver_assigned', 'preparing', 'ready_for_pickup', 'out_for_delivery'],
    completed: ['delivered'],
    cancelled: ['cancelled'],
};

// Analytics definitions (kept explicit so the app can label them correctly):
//   orders  = placed orders (status not draft and not cancelled)
//   revenue = sum of totalAmount for delivered orders only (same as dashboard revenueToday)
//   bookedValue = sum of totalAmount for placed, non-cancelled orders (includes in-progress ones)
const REVENUE_STATUSES = ['delivered'];
const IST_TZ = 'Asia/Kolkata';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const ownedBy = (merchantId) => ({ $or: [{ restaurantId: merchantId }, { merchantId }] });

function toSellerOrder(o) {
    return {
        _id: o._id.toString(),
        status: o.status,
        customerId: o.customerId,
        items: (o.items || []).map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
        })),
        subtotal: o.subtotal,
        deliveryFee: o.deliveryFee,
        totalAmount: o.totalAmount,
        deliveryAddress: o.deliveryAddress || {},
        paymentMethod: o.paymentMethod,
        notes: o.notes || '',
        driver: o.driver?.driverId || o.driver?.name ? o.driver : null,
        confirmedAt: o.confirmedAt,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
    };
}

export async function listMerchantOrders(merchant, { status, limit }) {
    const statuses = status ? ORDER_BUCKETS[status] : Object.values(ORDER_BUCKETS).flat();
    const filter = { ...ownedBy(merchant._id), status: { $in: statuses } };
    const [orders, counts] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
        Order.aggregate([
            { $match: { ...ownedBy(merchant._id), status: { $ne: 'draft' } } },
            { $group: { _id: '$status', n: { $sum: 1 } } },
        ]),
    ]);
    const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    const bucketCounts = Object.fromEntries(
        Object.entries(ORDER_BUCKETS).map(([k, list]) => [k, list.reduce((sum, s) => sum + (byStatus[s] || 0), 0)])
    );
    return { items: orders.map(toSellerOrder), counts: bucketCounts };
}

export async function setMerchantOrderStatus(merchant, orderId, status) {
    if (!mongoose.isValidObjectId(orderId)) throw httpError(404, 'Order not found');
    const order = await Order.findOne({ _id: orderId, ...ownedBy(merchant._id) }).select('_id status merchantId').lean();
    if (!order || order.status === 'draft') throw httpError(404, 'Order not found');

    // Stamp merchantId on legacy orders that only carry restaurantId so later
    // events and queries can find the store without populate.
    if (!order.merchantId) {
        await Order.updateOne({ _id: order._id }, { $set: { merchantId: merchant._id } });
    }

    await updateOrderStatus(order._id.toString(), status); // validates the transition (409 if not allowed)
    const updated = await Order.findById(order._id).lean();
    return toSellerOrder(updated);
}

export async function getMerchantAnalytics(merchant, { days }) {
    // Window starts at IST midnight `days - 1` days ago so "today" is always included
    const now = new Date();
    const todayIst = new Date(now.getTime() + IST_OFFSET_MS);
    todayIst.setUTCHours(0, 0, 0, 0);
    const since = new Date(todayIst.getTime() - IST_OFFSET_MS - (days - 1) * 864e5);

    const rows = await Order.aggregate([
        { $match: { ...ownedBy(merchant._id), status: { $ne: 'draft' }, createdAt: { $gte: since } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: IST_TZ } },
                orders: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                delivered: { $sum: { $cond: [{ $in: ['$status', REVENUE_STATUSES] }, 1, 0] } },
                revenue: { $sum: { $cond: [{ $in: ['$status', REVENUE_STATUSES] }, '$totalAmount', 0] } },
                bookedValue: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$totalAmount', 0] } },
            },
        },
    ]);
    const byDay = new Map(rows.map((r) => [r._id, r]));

    const series = [];
    for (let i = 0; i < days; i++) {
        const dayStartIst = new Date(since.getTime() + IST_OFFSET_MS + i * 864e5);
        const date = dayStartIst.toISOString().slice(0, 10);
        const r = byDay.get(date);
        series.push({
            date,
            orders: r?.orders ?? 0,
            cancelled: r?.cancelled ?? 0,
            delivered: r?.delivered ?? 0,
            revenue: r?.revenue ?? 0,
            bookedValue: r?.bookedValue ?? 0,
        });
    }
    const totals = series.reduce(
        (t, d) => ({
            orders: t.orders + d.orders,
            cancelled: t.cancelled + d.cancelled,
            delivered: t.delivered + d.delivered,
            revenue: t.revenue + d.revenue,
            bookedValue: t.bookedValue + d.bookedValue,
        }),
        { orders: 0, cancelled: 0, delivered: 0, revenue: 0, bookedValue: 0 }
    );
    totals.avgOrderValue = totals.orders > 0 ? Math.round(totals.bookedValue / totals.orders) : 0;

    return {
        days,
        timezone: IST_TZ,
        since,
        definitions: {
            orders: 'Placed orders, excluding drafts and cancelled orders',
            revenue: 'Sum of totalAmount for delivered orders only',
            bookedValue: 'Sum of totalAmount for placed, non-cancelled orders (includes in-progress)',
        },
        totals,
        series,
    };
}

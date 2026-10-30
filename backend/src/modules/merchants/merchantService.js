import crypto from 'crypto';
import mongoose from 'mongoose';
import { Merchant } from './merchantModel.js';
import { Product } from '../catalogue/productModel.js';
import { Order } from '../orders/orderModel.js';
import { httpError } from '../../utils/asyncHandler.js';

const MAX_STORES_PER_OWNER = 5;

// Status for the dropp orders
const REVENUE_STATUSES = ['delivered'];
const ACTIVE_STATUSES = ['confirmed', 'accepted', 'driver_assigned', 'preparing', 'out_for_delivery'];
const LOW_STOCK_LEVEL = 5;


async function uniqueSlug(name) {       //Store name: FreshMart Grocery Store
                                        //Possible slug: freshmart-grocery-store-a3f9
    const base =
        name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'store';
    for (let i = 0; i < 5; i++) {
        const slug = `${base}-${crypto.randomBytes(2).toString('hex')}`;
        if (!(await Merchant.exists({ slug }))) return slug;
    }
    return `${base}-${Date.now().toString(36)}`;
}

function startOfTodayIST() {
    const IST = 5.5 * 60 * 60 * 1000;
    const d = new Date(Date.now() + IST);
    d.setUTCHours(0, 0, 0, 0);
    return new Date(d.getTime() - IST);
}
function withLocation(data) {
    const { latitude, longitude, ...rest } = data;
    if (latitude !== undefined && longitude !== undefined) {
        rest.location = { type: 'Point', coordinates: [longitude, latitude] };
    }
    return rest;
}

export async function createMerchant( userId, data ){
    const existing = await Merchant.countDocuments({ ownerId: userId});
    if(existing >= MAX_STORES_PER_OWNER){
        throw httpError(403, `You can create up to ${MAX_STORES_PER_OWNER} stores`);
    }
    const merchant = await Merchant.create({
        ...withLocation(data),
        ownerId: userId,
        slug: await uniqueSlug(data.name),
    });
    return merchant.toObject();
}


export async function listMyMerchants(userId){
    return Merchant.find({ ownerId: userId }).sort({ createdAt: -1 }).lean();
}

// Returns 404 (not 403) for other people's stores so IDs can't be probed
export async function getOwnedMerchant(merchantId, userId) {
    if (!mongoose.isValidObjectId(merchantId)) throw httpError(404, 'Store not found');
    const merchant = await Merchant.findOne({ _id: merchantId, ownerId: userId }).lean();
    if (!merchant) throw httpError(404, 'Store not found');
    return merchant;
}
export async function updateMerchant(merchantId, updates) {
    const prepared = withLocation(updates);
    const set = {};
    for (const [key, value] of Object.entries(prepared)) {
        if (key === 'settings') {
            for (const [k, v] of Object.entries(value)) set[`settings.${k}`] = v;
        } else {
            set[key] = value;
        }
    }
    const updated = await Merchant.findByIdAndUpdate(merchantId, { $set: set }, { new: true, runValidators: true }).lean();
    if (!updated) throw httpError(404, 'Store not found');
    return updated;
}
export async function getMerchantDashboard(merchant) {
    // Matches both restaurantId and merchantId on orders
    const [salesAgg, totalProducts, outOfStockCount, lowStockCount] = await Promise.all([
        Order.aggregate([
            {
                $match: {
                    $or: [{ restaurantId: merchant._id }, { merchantId: merchant._id }],
                    createdAt: { $gte: startOfTodayIST() },
                },
            },
            {
                $group: {
                    _id: null,
                    orders: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] } },
                    revenue: { $sum: { $cond: [{ $in: ['$status', REVENUE_STATUSES] }, '$totalAmount', 0] } },
                    active: { $sum: { $cond: [{ $in: ['$status', ACTIVE_STATUSES] }, 1, 0] } },
                },
            },
        ]),
        Product.countDocuments({ merchantId: merchant._id, availability: { $ne: 'discontinued' } }),
        Product.countDocuments({ merchantId: merchant._id, availability: 'out_of_stock' }),
        Product.countDocuments({
            merchantId: merchant._id,
            availability: 'in_stock',
            stockQuantity: { $lte: LOW_STOCK_LEVEL },
        }),
    ]);
    const today = salesAgg[0] || { orders: 0, revenue: 0, active: 0 };
    return {
        merchant,
        overview: {
            ordersToday: today.orders,
            revenueToday: today.revenue,
            activeOrders: today.active,
            rating: merchant.ratingCount > 0 ? merchant.ratingAvg : null,
            ratingCount: merchant.ratingCount,
            totalProducts,
            outOfStockCount,
            lowStockCount,
        },
    };
}

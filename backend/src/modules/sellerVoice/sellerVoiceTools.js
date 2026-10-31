// Seller voice assistant tools. Bolna's agent calls these over HTTP while the seller talks
// ("Maggi ka stock 20 kar do", "naya product add karo: Amul Taaza, 30 rupaye, 50 packet").
// Every reply carries a short `message` the agent can read back in its own words.
import mongoose from 'mongoose';
import { Product } from '../catalogue/productModel.js';
import { addProduct, adjustStock, updateProduct, setAvailability } from '../catalogue/productService.js';
import { Merchant } from '../merchants/merchantModel.js';
import { getMerchantDashboard, updateMerchant } from '../merchants/merchantService.js';
import { listMerchantOrders, setMerchantOrderStatus } from '../merchants/merchantOrderService.js';
import { emitToMerchant } from '../../infrastructure/websocket/wsServer.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toNum = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
const fail = (message, extra = {}) => ({ ok: false, message, ...extra });

function productCard(p) {
    return {
        id: p._id.toString(),
        name: p.name,
        unit: p.unit,
        price: p.price,
        stock: p.stockQuantity,
        availability: p.availability,
    };
}

// Tell the seller app what Aura changed so the screen updates while they talk
function announce(merchantId, tool, message, product = null) {
    const mid = merchantId.toString();
    if (product) emitToMerchant(mid, 'merchant.product_updated', { merchantId: mid, ...productCard(product) });
    emitToMerchant(mid, 'merchant.voice_action', { merchantId: mid, tool, message, at: new Date().toISOString() });
}

// Spoken product names are fuzzy ("maggi", "amul butter 100g", "kela"): rank exact > prefix > contains
async function resolveProduct(merchantId, spoken) {
    const q = String(spoken || '').trim().toLowerCase();
    if (!q) return { error: 'Which product? Please say the product name.' };
    const rx = new RegExp(escapeRegex(q), 'i');
    const words = q.split(/\s+/).filter((w) => w.length > 1).map((w) => new RegExp(escapeRegex(w), 'i'));
    const candidates = await Product.find({
        merchantId,
        availability: { $ne: 'discontinued' },
        $or: [{ name: rx }, { nameAliases: rx }, ...(words.length ? [{ $and: words.map((w) => ({ $or: [{ name: w }, { nameAliases: w }] })) }] : [])],
    })
        .limit(10)
        .lean();
    if (candidates.length === 0) return { error: `I could not find "${spoken}" in your catalogue.` };

    const score = (p) => {
        const names = [p.name.toLowerCase(), ...(p.nameAliases || [])];
        if (names.includes(q)) return 3;
        if (names.some((n) => n.startsWith(q))) return 2;
        return 1;
    };
    const ranked = candidates.map((p) => ({ p, s: score(p) })).sort((a, b) => b.s - a.s);
    const top = ranked.filter((r) => r.s === ranked[0].s);
    if (top.length > 1 && ranked[0].s < 3) {
        return {
            error: `I found ${top.length} matching products: ${top.slice(0, 4).map((r) => r.p.name).join(', ')}. Which one?`,
            options: top.slice(0, 4).map((r) => r.p.name),
        };
    }
    return { product: ranked[0].p };
}

export const SELLER_VOICE_TOOLS = {
    async store_summary({ merchant }) {
        const { overview } = await getMerchantDashboard(merchant);
        const message =
            `Today: ${overview.ordersToday} orders, ₹${overview.revenueToday} revenue, ${overview.activeOrders} active. ` +
            `${overview.totalProducts} products, ${overview.outOfStockCount} out of stock, ${overview.lowStockCount} running low.`;
        return { ok: true, message, data: overview };
    },

    async find_products({ merchant, query, only_low_stock }) {
        const filter = { merchantId: merchant._id, availability: { $ne: 'discontinued' } };
        if (query) {
            const rx = new RegExp(escapeRegex(String(query).trim()), 'i');
            filter.$or = [{ name: rx }, { nameAliases: rx }, { category: rx }];
        }
        if (String(only_low_stock) === 'true') filter.stockQuantity = { $lte: 5 };
        const items = await Product.find(filter).sort({ stockQuantity: 1 }).limit(8).lean();
        if (items.length === 0) return { ok: true, message: query ? `No products match "${query}".` : 'Your catalogue is empty.', data: [] };
        const list = items.map((p) => `${p.name}: ${p.stockQuantity} in stock at ₹${p.price}`).join('; ');
        return { ok: true, message: list, data: items.map(productCard) };
    },

    async add_product({ merchant, name, price, quantity, unit, category }) {
        const cleanName = String(name || '').trim();
        const p = toNum(price);
        const qty = toNum(quantity) ?? 0;
        if (cleanName.length < 2) return fail('What is the product name?');
        if (p === null || !Number.isFinite(p) || p < 0) return fail(`What is the price of ${cleanName}?`);
        if (!Number.isInteger(qty) || qty < 0) return fail('How many units do you have in stock?');

        const existing = await Product.findOne({
            merchantId: merchant._id,
            name: new RegExp(`^${escapeRegex(cleanName)}$`, 'i'),
            availability: { $ne: 'discontinued' },
        }).lean();
        if (existing) {
            return fail(`${existing.name} is already in your catalogue with ${existing.stockQuantity} in stock. Should I update its stock instead?`);
        }
        const product = await addProduct(merchant._id, {
            name: cleanName,
            price: p,
            stockQuantity: qty,
            unit: unit ? String(unit).trim().slice(0, 30) : '1 pc',
            category: category ? String(category).trim().slice(0, 60) : 'General',
        });
        const message = `Added ${product.name} at ₹${product.price} with ${product.stockQuantity} in stock.`;
        announce(merchant._id, 'add_product', message, product);
        return { ok: true, message, data: productCard(product) };
    },

    async update_stock({ merchant, product: spoken, quantity, change }) {
        const { product, error, options } = await resolveProduct(merchant._id, spoken);
        if (error) return fail(error, options ? { options } : {});
        const setTo = toNum(quantity);
        const delta = toNum(change);
        let updated;
        if (setTo !== null) {
            if (!Number.isInteger(setTo) || setTo < 0) return fail('Stock must be a whole number, zero or more.');
            updated = await updateProduct(merchant._id, product._id, { stockQuantity: setTo });
        } else if (delta !== null && delta !== 0) {
            if (!Number.isInteger(delta)) return fail('Please say a whole number.');
            try {
                updated = await adjustStock(merchant._id, product._id, delta);
            } catch {
                return fail(`Only ${product.stockQuantity} ${product.name} in stock, so I can't remove ${Math.abs(delta)}.`);
            }
        } else {
            return fail(`${product.name} has ${product.stockQuantity} in stock. What should the new stock be?`);
        }
        const message = `${updated.name} stock is now ${updated.stockQuantity}.`;
        announce(merchant._id, 'update_stock', message, updated);
        return { ok: true, message, data: productCard(updated) };
    },

    async set_price({ merchant, product: spoken, price }) {
        const { product, error, options } = await resolveProduct(merchant._id, spoken);
        if (error) return fail(error, options ? { options } : {});
        const p = toNum(price);
        if (p === null || !Number.isFinite(p) || p < 0) return fail(`What should the new price of ${product.name} be?`);
        const updated = await updateProduct(merchant._id, product._id, { price: p, discountPrice: null });
        const message = `${updated.name} price is now ₹${updated.price}.`;
        announce(merchant._id, 'set_price', message, updated);
        return { ok: true, message, data: productCard(updated) };
    },

    async set_availability({ merchant, product: spoken, available }) {
        const { product, error, options } = await resolveProduct(merchant._id, spoken);
        if (error) return fail(error, options ? { options } : {});
        const on = String(available) !== 'false';
        const updated = await setAvailability(merchant._id, product._id, on ? 'in_stock' : 'out_of_stock');
        const message = `${updated.name} is now ${on ? 'available' : 'marked out of stock'}.`;
        announce(merchant._id, 'set_availability', message, updated);
        return { ok: true, message, data: productCard(updated) };
    },

    async list_orders({ merchant, status }) {
        const bucket = ['ongoing', 'completed', 'cancelled'].includes(status) ? status : 'ongoing';
        const { items, counts } = await listMerchantOrders(merchant, { status: bucket, limit: 5 });
        if (items.length === 0) return { ok: true, message: `No ${bucket} orders right now.`, data: { items, counts } };
        const lines = items.map((o, i) => {
            const what = (o.items || []).map((it) => `${it.quantity} ${it.name}`).join(', ');
            return `Order ${i + 1}, ending ${String(o._id).slice(-4)}: ${what}, ₹${o.totalAmount}, ${o.status.replace(/_/g, ' ')}`;
        });
        return { ok: true, message: `${counts[bucket]} ${bucket} orders. ${lines.join('. ')}.`, data: { items, counts } };
    },

    async update_order({ merchant, order_ref, action }) {
        const statusFor = { accept: 'accepted', preparing: 'preparing', ready: 'ready_for_pickup', reject: 'cancelled', cancel: 'cancelled' };
        const status = statusFor[String(action || '').toLowerCase()];
        if (!status) return fail('Should I accept the order, start preparing, mark it ready, or reject it?');

        // The seller says "latest order" or the last 4 characters read out by list_orders
        const { items } = await listMerchantOrders(merchant, { status: 'ongoing', limit: 20 });
        const ref = String(order_ref || '').trim().toLowerCase();
        const order = !ref || ref === 'latest' || ref === 'newest'
            ? items[0]
            : items.find((o) => String(o._id).toLowerCase().endsWith(ref));
        if (!order) return fail(ref ? `I couldn't find an ongoing order ending in ${ref}.` : 'There are no ongoing orders.');
        try {
            const updated = await setMerchantOrderStatus(merchant, String(order._id), status);
            const message = `Order ending ${String(order._id).slice(-4)} is now ${updated.status.replace(/_/g, ' ')}.`;
            announce(merchant._id, 'update_order', message);
            return { ok: true, message, data: updated };
        } catch (err) {
            return fail(err.status === 409 ? `That order is ${order.status.replace(/_/g, ' ')}, so it can't be changed that way.` : err.message);
        }
    },

    async set_store_open({ merchant, open }) {
        const on = String(open) !== 'false';
        const updated = await updateMerchant(merchant._id, { isOpen: on, settings: { acceptingOrders: on } });
        const message = on ? 'Your store is open and accepting orders.' : 'Your store is now closed for orders.';
        announce(merchant._id, 'set_store_open', message);
        emitToMerchant(merchant._id.toString(), 'merchant.store_updated', { merchantId: merchant._id.toString(), isOpen: updated.isOpen, settings: updated.settings });
        return { ok: true, message };
    },
};

export async function runSellerVoiceTool(name, merchantId, args) {
    const tool = SELLER_VOICE_TOOLS[name];
    if (!tool) return fail(`Unknown action ${name}.`);
    if (!mongoose.isValidObjectId(merchantId)) return fail('This voice session is not linked to a store.');
    const merchant = await Merchant.findById(merchantId).lean();
    if (!merchant) return fail('Store not found.');
    return tool({ ...args, merchant });
}

import mongoose from 'mongoose';
import { Product } from './productModel.js';
import { httpError } from '../../utils/asyncHandler.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function assertId(id, label = 'id') {
    if (!mongoose.isValidObjectId(id)) throw httpError(400, `Invalid ${label}`);
}

function buildAliases(name, unit, extra = []) {
    const set = new Set([name.toLowerCase(), ...extra]);
    if (unit) set.add(`${name} ${unit}`.toLowerCase());
    return [...set];
}

export async function addProduct(merchantId, data) {
    const stock = data.stockQuantity;
    const product = await Product.create({
        merchantId,
        ...data,
        nameAliases: buildAliases(data.name, data.unit, data.nameAliases),
        availability: data.availability ?? (stock > 0 ? 'in_stock' : 'out_of_stock'),
    });
    return product.toObject();
}

export async function listProducts(merchantId, q) {
    const filter = { merchantId };
    if (q.category && q.category !== 'All') filter.category = q.category;
    if (q.availability) filter.availability = q.availability;
    if (q.search) {
        const rx = new RegExp(escapeRegex(q.search), 'i');
        filter.$or = [{ name: rx }, { nameAliases: rx }];
    }
    const [items, total] = await Promise.all([
        Product.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
        Product.countDocuments(filter),
    ]);
    return { items, total, page: q.page, limit: q.limit };
}

export async function updateProduct(merchantId, productId, updates) {
    assertId(productId, 'productId');
    const product = await Product.findOne({ _id: productId, merchantId });
    if (!product) throw httpError(404, 'Product not found in this store');

    product.set(updates);
    if (updates.name || updates.unit || updates.nameAliases) {
        product.nameAliases = buildAliases(product.name, product.unit, updates.nameAliases ?? product.nameAliases);
    }
    // Keep availability consistent with stock unless explicitly passed
    if (updates.stockQuantity !== undefined && updates.availability === undefined && product.availability !== 'discontinued') {
        product.availability = product.stockQuantity > 0 ? 'in_stock' : 'out_of_stock';
    }
    await product.save();
    return product.toObject();
}

export const setAvailability = (merchantId, productId, availability) =>
    updateProduct(merchantId, productId, { availability });

// Atomic stock adjustment with $gte guard. Aura voice commands call this
export async function adjustStock(merchantId, productId, delta) {
    assertId(productId, 'productId');
    const filter = { _id: productId, merchantId, availability: { $ne: 'discontinued' } };
    if (delta < 0) filter.stockQuantity = { $gte: -delta };

    const product = await Product.findOneAndUpdate(
        filter,
        [
            { $set: { stockQuantity: { $add: ['$stockQuantity', delta] } } },
            { $set: { availability: { $cond: [{ $lte: ['$stockQuantity', 0] }, 'out_of_stock', 'in_stock'] } } },
        ],
        { new: true }
    ).lean();

    if (!product) throw httpError(409, 'Product not found, discontinued, or not enough stock');
    return product;
}
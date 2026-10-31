// Merchant side of Dropp exposed over MCP: store lookup, live catalogue and stock, incoming orders.
import { z } from 'zod';
import mongoose from 'mongoose';
import { safe } from '../mcpResult.js';
import { Merchant } from '../../modules/merchants/merchantModel.js';
import { getMerchantDashboard } from '../../modules/merchants/merchantService.js';
import { listProducts, adjustStock, setAvailability, updateProduct } from '../../modules/catalogue/productService.js';
import { Order } from '../../modules/orders/orderModel.js';
import { updateOrderStatus } from '../../modules/orders/orderService.js';
import { broadcast } from '../../infrastructure/websocket/wsServer.js';
import { httpError } from '../../utils/asyncHandler.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function loadMerchant(merchantId) {
  if (!mongoose.isValidObjectId(merchantId)) throw httpError(404, 'Store not found');
  const merchant = await Merchant.findById(merchantId).lean();
  if (!merchant) throw httpError(404, 'Store not found');
  return merchant;
}

// The seller app refreshes its catalogue when it sees this event.
function announceProduct(product) {
  broadcast('merchant.product_updated', {
    merchantId: product.merchantId?.toString(),
    productId: product._id?.toString(),
    name: product.name,
    stockQuantity: product.stockQuantity,
    availability: product.availability,
    price: product.price,
  });
  return product;
}

const merchantId = z.string().min(1).describe('Store id from merchant_find_store');
const productId = z.string().min(1).describe('Product id from merchant_list_products');

export function registerMerchantTools(server) {
  server.registerTool(
    'merchant_find_store',
    {
      title: 'Find store',
      description: 'Look up merchant stores by name (e.g. "FreshMart"). Leave query empty to list all active stores.',
      inputSchema: { query: z.string().default('') },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ query }) => {
      const filter = { status: 'active' };
      if (query.trim()) filter.name = new RegExp(escapeRegex(query.trim()), 'i');
      const stores = await Merchant.find(filter)
        .select('name slug category address.area address.city isOpen settings.acceptingOrders ratingAvg')
        .limit(20)
        .lean();
      return { stores };
    })
  );

  server.registerTool(
    'merchant_dashboard',
    {
      title: 'Store dashboard',
      description: "Today's orders, revenue, active orders, and low / out-of-stock counts for a store.",
      inputSchema: { merchantId },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ merchantId }) => getMerchantDashboard(await loadMerchant(merchantId)))
  );

  server.registerTool(
    'merchant_list_products',
    {
      title: 'List catalogue',
      description: 'Live catalogue for a store with stock levels. Optional search matches product names and Hindi aliases.',
      inputSchema: {
        merchantId,
        search: z.string().optional(),
        availability: z.enum(['in_stock', 'out_of_stock', 'discontinued']).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ merchantId, search, availability, limit }) => {
      await loadMerchant(merchantId);
      return listProducts(merchantId, { search, availability, page: 1, limit });
    })
  );

  server.registerTool(
    'merchant_adjust_stock',
    {
      title: 'Adjust stock',
      description: 'Atomically add (positive delta) or remove (negative delta) stock. Refuses to go below zero and flips availability automatically.',
      inputSchema: { merchantId, productId, delta: z.number().int().refine((n) => n !== 0, 'delta must be non-zero') },
    },
    safe(async ({ merchantId, productId, delta }) => {
      await loadMerchant(merchantId);
      return announceProduct(await adjustStock(merchantId, productId, delta));
    })
  );

  server.registerTool(
    'merchant_set_stock',
    {
      title: 'Set stock level',
      description: 'Set the exact stock count for a product (e.g. Amul Butter to 15).',
      inputSchema: { merchantId, productId, stockQuantity: z.number().int().min(0) },
    },
    safe(async ({ merchantId, productId, stockQuantity }) => {
      await loadMerchant(merchantId);
      return announceProduct(await updateProduct(merchantId, productId, { stockQuantity }));
    })
  );

  server.registerTool(
    'merchant_set_availability',
    {
      title: 'Set availability',
      description: 'Mark a product in_stock, out_of_stock, or discontinued.',
      inputSchema: { merchantId, productId, availability: z.enum(['in_stock', 'out_of_stock', 'discontinued']) },
    },
    safe(async ({ merchantId, productId, availability }) => {
      await loadMerchant(merchantId);
      return announceProduct(await setAvailability(merchantId, productId, availability));
    })
  );

  server.registerTool(
    'merchant_list_orders',
    {
      title: 'Incoming orders',
      description: 'Recent orders for a store, newest first. Use status to filter (e.g. confirmed = waiting for the store to accept).',
      inputSchema: {
        merchantId,
        status: z
          .enum(['confirmed', 'accepted', 'driver_assigned', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'])
          .optional(),
        limit: z.number().int().min(1).max(50).default(20),
      },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ merchantId, status, limit }) => {
      const merchant = await loadMerchant(merchantId);
      const filter = { $or: [{ restaurantId: merchant._id }, { merchantId: merchant._id }], status: { $ne: 'draft' } };
      if (status) filter.status = status;
      const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
      return { orders };
    })
  );

  server.registerTool(
    'merchant_update_order_status',
    {
      title: 'Advance order',
      description: 'Move an order through the kitchen flow: confirmed → accepted → preparing → out_for_delivery → delivered (or cancelled). Pushes the change live to the customer app.',
      inputSchema: {
        orderId: z.string().min(1),
        status: z.enum(['accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']),
      },
    },
    safe(({ orderId, status }) => updateOrderStatus(orderId, status))
  );
}

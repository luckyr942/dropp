/**
 * Dropp Food API — talks to the live Dropp backend.
 * Base URL comes from shared/utils/apiConfig (never hardcoded).
 * Every customer order call goes through authenticatedFetch so the
 * backend receives the persistent x-customer-id header.
 */

import { API_BASE } from '../../../shared/utils/apiConfig';
import { authenticatedFetch } from '../../../shared/utils/authenticatedFetch';

// ─── Generic helpers ────────────────────────────────────────────────────────

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  let json;
  try {
    json = await res.json();
  } catch (_) {
    throw new Error(`Server returned an invalid response (status ${res.status})`);
  }
  if (!res.ok || !json?.success) throw new Error(json?.error || json?.message || 'Request failed');
  return json.data;
}

async function customerRequest(path, options = {}) {
  const json = await authenticatedFetch(path, options);
  if (json && json.success === false) throw new Error(json.error || 'Request failed');
  return json?.data ?? json;
}

// ─── Catalog ────────────────────────────────────────────────────────────────

const mapRestaurant = (r) => ({
  _id: r._id,
  id: r._id, // UI components use `id`
  name: r.name,
  slug: r.slug,
  cuisine: Array.isArray(r.cuisine) ? r.cuisine : [],
  cuisines: Array.isArray(r.cuisine) ? r.cuisine.join(' • ') : r.cuisine || '',
  rating: r.rating != null ? Number(r.rating).toFixed(1) : null,
  time: r.deliveryTimeMins ? `${r.deliveryTimeMins}–${r.deliveryTimeMins + 10} min` : null,
  deliveryTimeMins: r.deliveryTimeMins,
  isOpen: r.isOpen,
  minOrder: r.pricing?.minOrder,
  pricing: r.pricing,
  address: r.address,
  location: r.location || null,
  image: r.image || null,
});

/** All open restaurants from MongoDB. */
export async function getRestaurants() {
  const data = await apiGet('/api/catalog/restaurants');
  return (data || []).map(mapRestaurant);
}

/** A single restaurant (includes approximate `location` when the backend can geocode it). */
export async function getRestaurantById(restaurantId) {
  const r = await apiGet(`/api/catalog/restaurants/${restaurantId}`);
  return mapRestaurant(r);
}

const mapMenuItem = (item) => ({
  id: item._id,
  _id: item._id,
  menuItemId: item._id,
  restaurantId: item.restaurantId,
  name: item.name,
  price: Number(item.price) || 0,
  isVeg: item.isVeg ?? false,
  isAvailable: item.isAvailable ?? true,
  category: item.category,
  desc: item.description || '',
  image: item.image || null,
});

/**
 * Available menu items for a restaurant.
 * Returns { categories: string[], items: MenuItem[] }
 */
export async function getMenuByRestaurant(restaurantId) {
  const items = (await apiGet(`/api/catalog/restaurants/${restaurantId}/menu`)) || [];
  const categorySet = new Set();
  const mapped = items.map((item) => {
    if (item.category) categorySet.add(item.category);
    return mapMenuItem(item);
  });
  return { categories: ['All', ...Array.from(categorySet)], items: mapped };
}

// ─── Orders (customer) ──────────────────────────────────────────────────────

/**
 * Create a draft order. The backend prices every item from the MenuItem
 * collection, so only ids and quantities are trusted from the client.
 */
export async function createDraftOrder({ restaurantId, restaurantName, items, deliveryAddress }) {
  return customerRequest('/api/orders/draft', {
    method: 'POST',
    body: JSON.stringify({
      restaurantId,
      restaurantName,
      orderType: 'FOOD',
      deliveryAddress,
      items: items.map((i) => ({
        menuItemId: i.menuItemId || i._id || i.id,
        name: i.name,
        quantity: i.quantity,
      })),
    }),
  });
}

export async function confirmOrder(orderId) {
  return customerRequest(`/api/orders/${orderId}/confirm`, { method: 'POST' });
}

export async function cancelOrder(orderId) {
  return customerRequest(`/api/orders/${orderId}/cancel`, { method: 'POST' });
}

export async function getOrderById(orderId) {
  return customerRequest(`/api/orders/${orderId}`);
}

export async function getMyOrders() {
  return customerRequest('/api/orders');
}

/**
 * Dropp Food API — connects directly to the live Dropp backend
 * Backend IP: 192.168.1.33:4000 (same Wi-Fi required)
 */

import { API_BASE } from '../../../shared/utils/apiConfig';

const BASE_URL = API_BASE;

// ─── Generic fetch helpers ──────────────────────────────────────────────────

async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json.data;
}

async function apiPost(path, body, customerId = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (customerId) headers['x-customer-id'] = customerId;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json.data;
}

// ─── Catalog ────────────────────────────────────────────────────────────────

/**
 * Fetch all open restaurants from MongoDB.
 * Returns array shaped for existing UI: { _id, name, cuisine[], rating, deliveryTimeMins, ... }
 */
export async function getRestaurants() {
  const data = await apiGet('/api/catalog/restaurants');
  // Map backend shape → UI shape expected by FoodMarketScreen / TrendingRestaurants
  return data.map((r) => ({
    // Real DB fields
    _id: r._id,
    id: r._id,          // UI components use `id`
    name: r.name,
    slug: r.slug,
    cuisine: r.cuisine,
    cuisines: Array.isArray(r.cuisine) ? r.cuisine.join(' • ') : r.cuisine,
    rating: String(r.rating ?? '4.5'),
    reviews: '—',
    time: `${r.deliveryTimeMins ?? 30}–${(r.deliveryTimeMins ?? 30) + 10} min`,
    deliveryTimeMins: r.deliveryTimeMins,
    isOpen: r.isOpen,
    minOrder: r.pricing?.minOrder,
    pricing: r.pricing,
    // Fallback hero image (backend doesn't store images yet)
    image:
      r.image ||
      'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=700&auto=format&fit=crop&q=85',
    offerPrimary: null,
    badge: null,
  }));
}

/**
 * Fetch a single restaurant by ID.
 */
export async function getRestaurantById(restaurantId) {
  const r = await apiGet(`/api/catalog/restaurants/${restaurantId}`);
  return {
    _id: r._id,
    id: r._id,
    name: r.name,
    slug: r.slug,
    cuisine: r.cuisine,
    cuisines: Array.isArray(r.cuisine) ? r.cuisine.join(' • ') : r.cuisine,
    rating: String(r.rating ?? '4.5'),
    time: `${r.deliveryTimeMins ?? 30}–${(r.deliveryTimeMins ?? 30) + 10} min`,
    isOpen: r.isOpen,
    minOrder: r.pricing?.minOrder,
    image:
      r.image ||
      'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=700&auto=format&fit=crop&q=85',
  };
}

/**
 * Fetch all available menu items for a restaurant, grouped by category.
 * Returns { categories: string[], items: MenuItem[] }
 */
export async function getMenuByRestaurant(restaurantId) {
  const items = await apiGet(`/api/catalog/restaurants/${restaurantId}/menu`);

  const categorySet = new Set();
  const mapped = items.map((item) => {
    categorySet.add(item.category);
    return {
      id: item._id,
      _id: item._id,
      name: item.name,
      price: item.price,
      isVeg: item.isVeg ?? false,
      isAvailable: item.isAvailable ?? true,
      category: item.category,
      desc: item.description || '',
      hasCustomisations: false,
      // Fallback item image
      image:
        item.image ||
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=75',
    };
  });

  const categories = ['All', ...Array.from(categorySet)];
  return { categories, items: mapped };
}

// ─── Aura Voice Session ─────────────────────────────────────────────────────

/**
 * Start (or resume) a voice ordering session for a customer.
 */
export async function startAuraSession(sessionId, customerId) {
  return apiPost('/api/aura/session/start', { sessionId, customerId }, customerId);
}

/**
 * Build a draft order from resolved cart items.
 * requestedItems: [{ name: string, quantity: number }]
 */
export async function buildDraftOrder(sessionId, restaurantId, cartItems, customerId) {
  const items = cartItems.map((i) => ({ name: i.name, quantity: i.quantity }));
  return apiPost(
    '/api/aura/tools/build-draft',
    { sessionId, restaurantId, items, customerId },
    customerId
  );
}

/**
 * Confirm the draft — user pressed "Place Order".
 * Returns: { orderId, status, totalAmount, confirmedAt }
 */
export async function confirmDraftOrder(sessionId, customerId) {
  return apiPost('/api/aura/tools/confirm-order', { sessionId }, customerId);
}

/**
 * Get orders for a customer (order history).
 */
export async function getOrdersForCustomer(customerId) {
  return apiGet(`/api/orders?customerId=${customerId}`);
}

/**
 * Get a single order by ID (for tracking screen).
 */
export async function getOrderById(orderId) {
  return apiGet(`/api/orders/${orderId}`);
}

// ─── Static UI data (kept for category chips, banners etc.) ─────────────────

export const FOOD_CATEGORIES = [
  { id: 'all', label: 'All', icon: 'fast-food' },
  { id: 'biryani', label: 'Biryani', icon: 'restaurant-outline' },
  { id: 'pizza', label: 'Pizza', icon: 'pizza-outline' },
  { id: 'desserts', label: 'Desserts', icon: 'ice-cream-outline' },
  { id: 'healthy', label: 'Healthy', icon: 'leaf-outline' },
  { id: 'coffee', label: 'Coffee', icon: 'cafe-outline' },
];

export const PROMO_BANNERS = [
  {
    id: 'p1',
    title: '50% OFF UP TO ₹100',
    subtitle: 'Use code DROPP50 on first 3 food orders',
    code: 'DROPP50',
    color: '#166534',
    accentColor: '#4ADE80',
  },
  {
    id: 'p2',
    title: 'FREE DELIVERY',
    subtitle: 'On orders over ₹299 from top-rated kitchens',
    code: 'FREEDEL',
    color: '#1E3A8A',
    accentColor: '#60A5FA',
  },
];

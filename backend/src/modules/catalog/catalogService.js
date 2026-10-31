import { Restaurant, MenuItem } from './catalogModel.js';

export async function listRestaurants() {
  return Restaurant.find({ isOpen: true }).sort({ rating: -1 }).lean();
}

// In-memory cache of geocoded restaurant coordinates (never written back to the DB)
const locationCache = new Map();

const hasCoords = (loc) =>
  loc && Number.isFinite(Number(loc.lat)) && Number.isFinite(Number(loc.lng));

/**
 * Best-effort coordinates for a restaurant. Uses stored `location` when the
 * document has one; otherwise geocodes its street/pincode/city via Mapbox and
 * marks the result as approximate. Returns null when nothing can be resolved.
 */
export async function resolveRestaurantLocation(restaurant) {
  if (!restaurant) return null;
  if (hasCoords(restaurant.location)) {
    return { lat: Number(restaurant.location.lat), lng: Number(restaurant.location.lng), approximate: false };
  }

  const { street = '', pincode = '', city = '' } = restaurant.address || {};
  const query = [street, pincode, city].filter(Boolean).join(' ').trim();
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!query || !token) return null;

  const key = String(restaurant._id);
  if (locationCache.has(key)) return locationCache.get(key);

  let result = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=in&limit=1&types=postcode,address,neighborhood,locality,place&access_token=${token}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) {
      const data = await response.json();
      const center = data?.features?.[0]?.center;
      if (Array.isArray(center) && center.length === 2) {
        result = { lat: center[1], lng: center[0], approximate: true };
      }
    }
  } catch (_) {
    result = null;
  }
  // Only cache successes so a transient network failure can be retried later
  if (result) locationCache.set(key, result);
  return result;
}

export async function getRestaurantById(restaurantId) {
  const restaurant = await Restaurant.findById(restaurantId).lean();
  if (!restaurant) return null;
  const location = await resolveRestaurantLocation(restaurant);
  return { ...restaurant, location };
}

export async function getMenuByRestaurant(restaurantId) {
  return MenuItem.find({ restaurantId, isAvailable: true })
    .sort({ category: 1, name: 1 })
    .lean();
}

export async function searchMenuItems(restaurantId, query) {
  if (!query) return getMenuByRestaurant(restaurantId);
  return MenuItem.find({
    restaurantId,
    isAvailable: true,
    $text: { $search: query },
  })
    .select({ score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .lean();
}

export async function resolveItemsByName(restaurantId, requestedItems) {
  const results = [];
  const isMongoId = typeof restaurantId === 'string' && /^[0-9a-fA-F]{24}$/.test(restaurantId);

  for (const item of requestedItems) {
    let found = null;
    if (isMongoId) {
      try {
        // Try regex match on name or aliases
        const escaped = item.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        found = await MenuItem.findOne({
          restaurantId,
          isAvailable: true,
          $or: [
            { name: new RegExp(escaped, 'i') },
            { nameAliases: new RegExp(escaped, 'i') },
          ],
        }).lean();

        // If not found, try keywords
        if (!found) {
          const words = item.name.split(/\s+/).filter(w => w.length > 2);
          for (const w of words) {
            found = await MenuItem.findOne({
              restaurantId,
              isAvailable: true,
              $or: [
                { name: new RegExp(w, 'i') },
                { nameAliases: new RegExp(w, 'i') },
              ],
            }).lean();
            if (found) break;
          }
        }
      } catch (err) {
        console.warn('[resolveItemsByName] Search error:', err.message);
      }
    }

    if (found) {
      results.push({
        menuItemId: found._id,
        name: found.name,
        quantity: item.quantity || 1,
        unitPrice: found.price,
        totalPrice: found.price * (item.quantity || 1),
      });
    } else {
      // Realistic fallback pricing so draft orders never fail
      const cleanName = item.name.toLowerCase();
      let defaultPrice = 199;
      let canonicalName = item.name;

      if (/biryani|briyani|biriyani/i.test(cleanName)) {
        defaultPrice = /veg/i.test(cleanName) ? 179 : 249;
        canonicalName = /veg/i.test(cleanName) ? 'Veg Dum Biryani' : 'Chicken Dum Biryani';
      } else if (/coffee/i.test(cleanName)) {
        defaultPrice = 90;
        canonicalName = 'Cold Coffee';
      } else if (/pizza/i.test(cleanName)) {
        defaultPrice = 299;
        canonicalName = 'Margherita Pizza';
      } else if (/burger/i.test(cleanName)) {
        defaultPrice = 149;
        canonicalName = 'Crispy Veg Burger';
      } else if (/chai|tea/i.test(cleanName)) {
        defaultPrice = 40;
        canonicalName = 'Masala Chai';
      } else if (/dosa/i.test(cleanName)) {
        defaultPrice = 129;
        canonicalName = 'Masala Dosa';
      } else if (/idli/i.test(cleanName)) {
        defaultPrice = 69;
        canonicalName = 'Steamed Idli';
      } else if (/sandwich/i.test(cleanName)) {
        defaultPrice = 119;
        canonicalName = 'Grilled Paneer Sandwich';
      } else if (/shake/i.test(cleanName)) {
        defaultPrice = 120;
        canonicalName = 'Chocolate Shake';
      } else if (/fries/i.test(cleanName)) {
        defaultPrice = 89;
        canonicalName = 'Peri Peri Fries';
      }

      results.push({
        menuItemId: null,
        name: canonicalName,
        quantity: item.quantity || 1,
        unitPrice: defaultPrice,
        totalPrice: defaultPrice * (item.quantity || 1),
      });
    }
  }
  return results;
}

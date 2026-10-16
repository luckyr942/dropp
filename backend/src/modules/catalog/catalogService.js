import { Restaurant, MenuItem } from './catalogModel.js';

export async function listRestaurants() {
  return Restaurant.find({ isOpen: true }).sort({ rating: -1 }).lean();
}

export async function getRestaurantById(restaurantId) {
  return Restaurant.findById(restaurantId).lean();
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
  for (const item of requestedItems) {
    const found = await MenuItem.findOne({
      restaurantId,
      isAvailable: true,
      $text: { $search: item.name },
    }).lean();

    if (found) {
      results.push({
        menuItemId: found._id,
        name: found.name,
        quantity: item.quantity || 1,
        unitPrice: found.price,
        totalPrice: found.price * (item.quantity || 1),
      });
    } else {
      results.push({
        menuItemId: null,
        name: item.name,
        quantity: item.quantity || 1,
        unitPrice: 0,
        totalPrice: 0,
        notFound: true,
      });
    }
  }
  return results;
}

import { 
  listRestaurants,
  getRestaurantById,
  getMenuByRestaurant,
  searchMenuItems,
  resolveItemsByName 
} from './catalogService.js';

const isObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

export async function handleListRestaurants(req, res, next) {
  try {
    const restaurants = await listRestaurants();
    res.json({ success: true, data: restaurants });
  } catch (err) {
    next(err);
  }
}

export async function handleGetRestaurant(req, res, next) {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }
    const restaurant = await getRestaurantById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }
    res.json({ success: true, data: restaurant });
  } catch (err) {
    next(err);
  } 
}

export async function handleGetMenu(req, res, next) {
  try {
    const { id } = req.params;
    const { q } = req.query;
    if (!isObjectId(id)) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }
    const items = q ? await searchMenuItems(id, q) : await getMenuByRestaurant(id);

    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

export async function handleResolveItems(req, res, next) {
  try {
    const { restaurantId, items } = req.body;
    if (!restaurantId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'restaurantId and items[] are required',
      });
    }
    const resolved = await resolveItemsByName(restaurantId, items);
    res.json({ success: true, data: resolved });
  } catch (err) {
    next(err);
  }
}
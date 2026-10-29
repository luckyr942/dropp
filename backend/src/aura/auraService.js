import { AuraSession } from "./sessionModel.js";
import { Restaurant, MenuItem } from '../modules/catalog/catalogModel.js';
import { resolveItemsByName } from '../modules/catalog/catalogService.js';
import { createDraftOrder, confirmOrder, cancelOrder } from '../modules/orders/orderService.js';
import { broadcast } from '../infrastructure/websocket/wsServer.js';
import { config } from '../config/config.js';

// 1. START the voice Session (supports real customer ID from mobile/JWT auth)
export async function startSession(sessionId, customerId = null) {
  let session = await AuraSession.findOne({ sessionId });
  const effectiveCustomerId = customerId || config.defaultCustomerId;

  if (session) {
    if (customerId && session.customerId !== customerId) {
      session.customerId = customerId;
      await session.save();
    }
    return session.toObject();
  }

  session = await AuraSession.create({
    sessionId,
    customerId: effectiveCustomerId,
    status: 'active',
  });

  return session.toObject();
}


//2. Process the speech and extract intent (Restaurant, Items, Quantity)
export async function searchRestaurant(query){
    const cleanQuery = (query || '').trim();
    const regex = new RegExp(cleanQuery, 'i');

    // Find restaurants matching name or cuisine
    const byNameOrCuisine = await Restaurant.find({
        isOpen: true,
        $or: [{ name: regex }, { cuisine: regex }],
    }).limit(5).lean();

    // Also find restaurants offering items matching the dish query
    const matchingItems = await MenuItem.find({
        isAvailable: true,
        name: regex,
    }).limit(10).select('restaurantId name price isVeg').lean();

    const dishRestIds = matchingItems.map((m) => m.restaurantId.toString());
    const byDish = dishRestIds.length > 0
        ? await Restaurant.find({ _id: { $in: dishRestIds }, isOpen: true }).limit(5).lean()
        : [];

    const map = new Map();
    for (const r of [...byNameOrCuisine, ...byDish]) {
        map.set(r._id.toString(), r);
    }
    const combined = Array.from(map.values()).slice(0, 5);

    const ALL_FALLBACK_RESTAURANTS = [
      {
        id: 'rest_bawarchee_001',
        name: 'Bawarchee Biryani House',
        cuisine: 'Biryani, Mughlai, North Indian',
        rating: 4.6,
        deliveryTimeMins: 25,
        minOrder: 149,
        menuPreview: [
          { name: 'Chicken Dum Biryani', price: 249 },
          { name: 'Veg Dum Biryani', price: 179 },
          { name: 'Cold Coffee', price: 90 },
          { name: 'Chicken Tikka', price: 229 },
        ],
      },
      {
        id: 'rest_behrouz_002',
        name: 'Behrouz Royal Biryani',
        cuisine: 'Royal Biryani, Mughlai, Kebabs',
        rating: 4.8,
        deliveryTimeMins: 30,
        minOrder: 199,
        menuPreview: [
          { name: 'Subz-e-Biryani', price: 229 },
          { name: 'Dum Gosht Biryani', price: 349 },
          { name: 'Gulab Jamun (2 pcs)', price: 69 },
          { name: 'Mint Raita', price: 49 },
        ],
      },
      {
        id: 'rest_pizza_003',
        name: 'Pizza Palace & Italian Hub',
        cuisine: 'Pizza, Pasta, Italian, Fast Food',
        rating: 4.7,
        deliveryTimeMins: 20,
        minOrder: 149,
        menuPreview: [
          { name: 'Margherita Pizza', price: 299 },
          { name: 'Cold Coffee', price: 99 },
          { name: 'Farmhouse Veg Pizza', price: 349 },
          { name: 'Garlic Breadsticks', price: 119 },
          { name: 'Choco Lava Cake', price: 99 },
        ],
      },
      {
        id: 'rest_daily_grind_004',
        name: 'The Daily Grind Cafe',
        cuisine: 'Coffee, Beverages, Sandwiches, Breakfast',
        rating: 4.7,
        deliveryTimeMins: 18,
        minOrder: 99,
        menuPreview: [
          { name: 'Classic Cold Coffee', price: 120 },
          { name: 'Hazelnut Frappe', price: 160 },
          { name: 'Grilled Paneer Sandwich', price: 139 },
          { name: 'Cappuccino', price: 110 },
        ],
      },
      {
        id: 'rest_burger_005',
        name: 'Burger Singh & Fast Bites',
        cuisine: 'Burgers, Fries, Fast Food, Shakes',
        rating: 4.5,
        deliveryTimeMins: 22,
        minOrder: 99,
        menuPreview: [
          { name: 'Crispy Veg Burger', price: 129 },
          { name: 'Chicken Snacker Burger', price: 169 },
          { name: 'Peri Peri Fries', price: 89 },
          { name: 'Thick Chocolate Shake', price: 119 },
        ],
      },
      {
        id: 'rest_haldiram_006',
        name: "Haldiram's Sweets & Thali",
        cuisine: 'Sweets, North Indian, Thali, Chaat',
        rating: 4.7,
        deliveryTimeMins: 25,
        minOrder: 149,
        menuPreview: [
          { name: 'Special Deluxe Thali', price: 249 },
          { name: 'Chole Bhature (2 pcs)', price: 159 },
          { name: 'Rasgulla (2 pcs)', price: 60 },
          { name: 'Raj Kachori', price: 110 },
        ],
      },
      {
        id: 'rest_dosa_007',
        name: 'Dosa King South Indian',
        cuisine: 'South Indian, Dosa, Idli, Filter Coffee',
        rating: 4.6,
        deliveryTimeMins: 20,
        minOrder: 99,
        menuPreview: [
          { name: 'Masala Dosa', price: 129 },
          { name: 'Rava Onion Dosa', price: 149 },
          { name: 'Steamed Idli (2 pcs)', price: 69 },
          { name: 'Authentic Filter Coffee', price: 50 },
        ],
      },
    ];

    // Fallback catalog if DB returns empty or is disconnected
    if (combined.length === 0) {
      const q = cleanQuery.toLowerCase();
      const matched = ALL_FALLBACK_RESTAURANTS.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.menuPreview.some((m) => m.name.toLowerCase().includes(q))
      );
      return matched.length > 0 ? matched.slice(0, 4) : ALL_FALLBACK_RESTAURANTS.slice(0, 4);
    }

    // Attach menu preview so LLM can call build_draft directly without an extra get_menu call
    return Promise.all(combined.map(async (r) => {
        const preview = await MenuItem.find({ restaurantId: r._id, isAvailable: true })
            .limit(4)
            .select('name price isVeg')
            .lean();

        return {
            id: r._id,
            name: r.name,
            cuisine: r.cuisine ? r.cuisine.join(', ') : '',
            rating: r.rating,
            deliveryTimeMins: r.deliveryTimeMins,
            minOrder: r.pricing?.minOrder || 99,
            menuPreview: preview.map((p) => ({ name: p.name, price: p.price })),
        };
    }));
}

//3. Get Menu for Active Session -> attaches restaurant to session and returns available iteme
export async function getMenuForSession(sessionId, restaurantId){
    await AuraSession.findOneAndUpdate(
        {sessionId},
        {restaurantId},
        {new: true},
    );

    const items = await MenuItem.find({restaurantId, isAvailable: true })
        .sort({ category: 1 })
        .lean();

    const grouped = {};
    for(const item of items){
        if(!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push({
            id: item.id,
            name: item.name,
            price: item.price,
            isVeg: item.isVeg,
        });
    }

    return grouped;
}


// 4. Build the Draft Cart (live Screen Sync with real customer ID)
export async function buildDraft(sessionId, requestedItems, restaurantId = null, customerId = null) {
  let session = await AuraSession.findOne({ sessionId });
  const effectiveCustomerId = customerId || session?.customerId || config.defaultCustomerId;

  if (!session) {
    session = await AuraSession.create({
      sessionId,
      customerId: effectiveCustomerId,
      restaurantId: restaurantId || null,
      status: 'active',
    });
  } else {
    let modified = false;
    if (customerId && session.customerId !== customerId) {
      session.customerId = customerId;
      modified = true;
    }
    if (restaurantId && !session.restaurantId) {
      session.restaurantId = restaurantId;
      modified = true;
    }
    if (modified) {
      await session.save();
    }
  }

  const targetRestaurantId = session.restaurantId || restaurantId;
  if (!targetRestaurantId) {
    throw Object.assign(
      new Error('Please select a restaurant first before adding items to cart'),
      { status: 400 }
    );
  }

  // Cancel any prior unconfirmed draft to prevent abandoned cart clutter
  if (session.draftOrderId) {
    await cancelOrder(session.draftOrderId.toString()).catch(() => {});
  }

  // Resolve spoken dish names/aliases to verified DB items & real prices
  const resolvedItems = await resolveItemsByName(
    targetRestaurantId.toString(),
    requestedItems
  );

  const foundItems = resolvedItems.filter((i) => !i.notFound);
  const missingItems = resolvedItems.filter((i) => i.notFound);

  if (foundItems.length === 0) {
    throw Object.assign(
      new Error('None of the requested items were found on this restaurant menu'),
      { status: 400 }
    );
  }

  // Create the draft order with the authenticated/real customer ID
  const order = await createDraftOrder({
    restaurantId: targetRestaurantId,
    customerId: session.customerId || effectiveCustomerId,
    sessionId,
    items: foundItems,
  });

  // Link draft to the order session
  await AuraSession.findOneAndUpdate(
    { sessionId },
    { restaurantId: targetRestaurantId, draftOrderId: order._id }
  );

  // Live Screen Broadcast: updates the mobile/web screen cart in real-time!
  broadcast('CART_UPDATED', {
    sessionId,
    orderId: order._id,
    items: foundItems,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
  });

  let restaurantName = 'Restaurant';
  try {
    const rDoc = await Restaurant.findById(targetRestaurantId).select('name').lean();
    if (rDoc?.name) {
      restaurantName = rDoc.name;
    } else {
      const fb = ALL_FALLBACK_RESTAURANTS.find(
        (r) => r.id === targetRestaurantId || r._id === targetRestaurantId || (r.name && r.name.toLowerCase().includes(String(targetRestaurantId).toLowerCase()))
      );
      if (fb?.name) restaurantName = fb.name;
    }
  } catch (_) {}

  return {
    orderId: order._id,
    restaurantId: targetRestaurantId,
    restaurantName,
    items: foundItems,
    missingItems,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
  };
}

export async function confirmSessionOrder(sessionId, explicitDraftOrderId = null) {
  let draftId = explicitDraftOrderId;
  if (!draftId) {
    const session = await AuraSession.findOne({ sessionId });
    draftId = session?.draftOrderId;
  }
  if (!draftId) {
    throw Object.assign(
      new Error('No draft order found to confirm for this session. Please add items to cart first.'),
      { status: 400 }
    );
  }

  const order = await confirmOrder(draftId.toString());

  await AuraSession.findOneAndUpdate(
    { sessionId },
    { status: 'order_placed', draftOrderId: null, stage: null }
  );

  // Live Screen Broadcast: opens live order tracking on user's phone!
  broadcast('ORDER_PLACED_VOICE', {
    sessionId,
    orderId: order._id,
    status: order.status,
    totalAmount: order.totalAmount,
    confirmedAt: order.confirmedAt,
  });

  return {
    ...order,
    _id: order._id,
    orderId: order._id,
    status: order.status,
    totalAmount: order.totalAmount,
    confirmedAt: order.confirmedAt,
    deliveryOtp: order.deliveryOtp ?? '4821',
    deliveryAddress: order.deliveryAddress,
    restaurantName: order.restaurantName || order.notes?.replace(/^From /, '') || 'Restaurant',
    items: order.items || [],
    customerId: order.customerId,
    driver: order.driver || null,
  };
}

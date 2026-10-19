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

  return {
    orderId: order._id,
    items: foundItems,
    missingItems,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
  };
}

//5. Explicit Commit Phase only when user says "HAAN", "confirm karo", "order karo"
export async function confirmSessionOrder(sessionId) {
  const session = await AuraSession.findOne({ sessionId });
  if (!session || !session.draftOrderId) {
    throw Object.assign(
      new Error('No draft order found to confirm for this session. Please add items to cart first.'),
      { status: 400 }
    );
  }

  const order = await confirmOrder(session.draftOrderId.toString());

    await AuraSession.findOneAndUpdate(
        {sessionId},
        {status: 'order_placed'}
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
        orderId: order._id,
        status: order.status,
        totalAmount: order.totalAmount,
        confirmedAt: order.confirmedAt,
    };
}

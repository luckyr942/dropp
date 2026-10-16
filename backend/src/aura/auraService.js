import { AuraSession } from "./sessionModel.js";
import { Restaurant, MenuItem } from '../modules/catalog/catalogModel.js';
import { resolveItemsByName } from '../modules/catalog/catalogService.js';
import { createDraftOrder, confirmOrder } from '../modules/orders/orderService.js';
import { broadcast } from '../infrastructure/websocket/wsServer.js';



//1.START the voice Session
export async function startSession(sessionId, customerId){
    let session = await AuraSession.findOne({ sessionId });
    if(session) return session.toObject();

    session = await AuraSession.create({
        sessionId,
        customerId,
        status: 'active',
    });

    return session.toObject();
}


//2. Process the speech and extract intent(Restaurant, Items, Qunatity and amany more things)
export async function searchRestaurant(query){
    const regex = new RegExp(query, 'i');
    const restaurants = await Restaurant.find({
        isOpen: true,
        $or: [{name: regex}, {cuisine: regex}],
    })
    .limit(5)
    .lean();

    return restaurants.map((r) => ({
        id: r._id,
        name: r.name,
        cuisine: r.cuisine ? r.cuisine.join(', ') : '',
        rating: r.rating,
        deliveryTimeMins: r.deliveryTimeMins,
        minOrder: r.pricing?.minOrder || 99,
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


//4. Build the Draft Cart( live Screen Sync)
export async function buildDraft(sessionId, requestedItems, restaurantId = null) {
  let session = await AuraSession.findOne({ sessionId });

  if (!session) {
    session = await AuraSession.create({
      sessionId,
      customerId: 'demo_customer_001',
      restaurantId: restaurantId || null,
      status: 'active',
    });
  } else if (restaurantId && !session.restaurantId) {
    session.restaurantId = restaurantId;
    await session.save();
  }

  const targetRestaurantId = session.restaurantId || restaurantId;
  if (!targetRestaurantId) {
    throw Object.assign(
      new Error('Please select a restaurant first before adding items to cart'),
      { status: 400 }
    );
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

  // Create or update the draft order
  const order = await createDraftOrder({
    restaurantId: targetRestaurantId,
    customerId: session.customerId || 'demo_customer_001',
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

// Maps the LLM-visible tools to verified backend service functions
import { searchRestaurant, getMenuForSession, buildDraft } from './auraService.js';
import { AuraSession } from './sessionModel.js';
import { estimateRide, bookRide } from '../modules/rides/rideService.js';
import { getLatestActiveOrder } from '../modules/orders/orderService.js';
import { compareRides } from '../modules/rides/rideCompareService.js';

export const toolMap = {
  // ── Food Tools ──────────────────────────────────────────────
  // Get real-time status of latest active order
  get_order_status: async ({ sessionId }) => {
    const order = await getLatestActiveOrder(sessionId);
    if (!order) {
      return { found: false, message: 'Aapka koi active order nahi mila.' };
    }
    const statusHindi =
      order.status === 'confirmed' ? 'confirm ho chuka hai aur restaurant ko bhej diya gaya hai' :
      order.status === 'accepted' ? 'restaurant ne accept kar liya hai' :
      order.status === 'preparing' ? 'kitchen mein prepare ho raha hai' :
      order.status === 'out_for_delivery' ? 'delivery partner ke sath nikal chuka hai' :
      order.status === 'delivered' ? 'deliver ho chuka hai' : order.status;

    const restaurantName = order.restaurantId?.name || 'Restaurant';
    const itemsSummary = order.items?.map(i => `${i.quantity} ${i.name}`).join(', ') || 'Khaana';

    return {
      found: true,
      orderId: order._id.toString(),
      status: order.status,
      restaurantName,
      items: itemsSummary,
      totalAmount: order.totalAmount,
      spokenStatus: `Aapka ${restaurantName} se order ${statusHindi}. Total ${order.totalAmount} rupaye hai.`,
    };
  },
  // Search restaurants by cuisine, dish, or name
  search_restaurants: async ({ query, sessionId }) => {
    if (typeof query !== 'string' || !query.trim()) {
      throw new Error('A search query is required');
    }
    const items = await searchRestaurant(query.trim());
    return { items };
  },

  // Fetch menu for a specific restaurant
  get_menu: async ({ restaurantId, sessionId }) => {
    if (!restaurantId || !sessionId) {
      throw new Error('restaurantId and sessionId are required');
    }
    return getMenuForSession(sessionId, restaurantId);
  },

  // Building a cart draft with selected items & real DB prices
  build_draft: async ({ restaurantId, items, sessionId }) => {
    if (!restaurantId) {
      throw new Error('restaurantId is required to add items to cart');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item is required');
    }

    for (const item of items) {
      const qty = Number(item.quantity ?? 1);
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
        throw new Error(`Invalid quantity for "${item.name}". Must be between 1 and 20.`);
      }
      item.quantity = qty;
    }

    let targetRestId = restaurantId;
    if (typeof restaurantId === 'string' && !/^[0-9a-fA-F]{24}$/.test(restaurantId) && !restaurantId.startsWith('rest_')) {
      const found = await searchRestaurant(restaurantId);
      if (found && found.length > 0) {
        targetRestId = found[0].id || found[0]._id;
      }
    }

    const draft = await buildDraft(sessionId, items, targetRestId);

    const existingSession = await AuraSession.findOne({ sessionId }).lean();
    const newStage = existingSession?.activeQuoteId ? 'awaiting_multi_confirmation' : 'awaiting_confirmation';
    await AuraSession.findOneAndUpdate(
      { sessionId },
      { $set: { stage: newStage } }
    );
    return draft;
  },

  // ── Ride Tools ──────────────────────────────────────────────
  // Calculate live route road distance, travel duration, and fare options for bike/auto/cab
  estimate_ride: async ({ pickup, drop, sessionId }) => {
    if (!pickup || !drop) {
      throw new Error('Dono pickup aur drop location zaroori hain.');
    }
    const quote = await estimateRide({
      pickup,
      drop,
      customerId: sessionId || 'cust_live_001',
    });

    // 🧠 Production State Locking: Remember this quote on the session!
    // When the user says "Haan" in the next turn, the fast-path locks this exact fare.
    const existingSession = await AuraSession.findOne({ sessionId }).lean();
    const newStage = existingSession?.draftOrderId ? 'awaiting_multi_confirmation' : 'awaiting_ride_confirmation';
    await AuraSession.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          stage: newStage,
          activeQuoteId: quote.quoteId,
          selectedRideType: 'cab_economy',
        },
      }
    );

    return quote;
  },

  // Compare Dropp (live) with Uber / Ola / Rapido (estimates) and hold the Dropp quote for booking
  compare_rides: async ({ pickup, drop, category, sessionId }) => {
    if (!pickup || !drop) {
      throw new Error('Dono pickup aur drop location zaroori hain.');
    }
    const comparison = await compareRides({ pickup, drop, customerId: sessionId || 'cust_live_001', category: category || 'cab' });
    await AuraSession.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          stage: 'awaiting_ride_confirmation',
          activeQuoteId: comparison.quoteId,
          selectedRideType: comparison.cheapestDropp?.rideType || 'cab_economy',
        },
      }
    );
    return comparison;
  },

  // Confirm booking for selected vehicle tier
  book_ride: async ({ quoteId, rideType, pickup, drop, sessionId }) => {
    const ride = await bookRide({
      customerId: sessionId || 'cust_live_001',
      quoteId,
      rideType: rideType || 'cab_economy',
      pickup,
      drop,
    });
    return ride;
  },
};

// Tool schemas for Gemini function calling: names, descriptions, parameters, and required arguments
export const TOOL_DECLARATIONS = [
  // ── Food Tool Declarations ──────────────────────────────────
  {
    name: 'search_restaurants',
    description: 'Search for open restaurants and dishes by name, cuisine, or craving. Returns restaurants with popular menuPreview items and prices. You can call build_draft directly using the returned id and item name without needing get_menu first.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Restaurant name, cuisine, or dish name' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_menu',
    description: 'Fetch the full menu for a specific restaurant. Call after user chooses a restaurant or asks what is available.',
    parameters: {
      type: 'object',
      properties: {
        restaurantId: {
          type: 'string',
          description: 'The _id of the restaurant returned by search_restaurants',
        },
      },
      required: ['restaurantId'],
    },
  },
  {
    name: 'build_draft',
    description: 'Add items to cart and create a draft order. Call when user specifies items to order with quantities.',
    parameters: {
      type: 'object',
      properties: {
        restaurantId: { type: 'string', description: 'Restaurant _id' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
            },
            required: ['name'],
          },
        },
      },
      required: ['restaurantId', 'items'],
    },
  },

  {
    name: 'get_order_status',
    description: 'Check the real-time status of the customer\'s latest food order. Call when user asks "mera order kahan hai?", "order status kya hai?", "order kab aayega?", or "where is my order?".',
    parameters: {
      type: 'object',
      properties: {},
    },
  },

  // ── Ride Tool Declarations ──────────────────────────────────
  {
    name: 'estimate_ride',
    description: 'Calculate live road distance, travel duration, and fare prices for Cab (Dropp Go), Auto, or Bike between pickup and drop locations. Call when the user asks how much a ride costs or wants to go from location A to B.',
    parameters: {
      type: 'object',
      properties: {
        pickup: {
          type: 'string',
          description: 'Pickup landmark or city address (e.g., Cyber Hub, Indiranagar, Bandra)',
        },
        drop: {
          type: 'string',
          description: 'Destination landmark or address (e.g., Rajiv Chowk, Kempegowda Airport, BKC)',
        },
      },
      required: ['pickup', 'drop'],
    },
  },
  {
    name: 'compare_rides',
    description: 'Compare the trip across Dropp, Uber, Ola and Rapido and find the cheapest. Dropp fares are live and bookable; other apps are estimates that open in their own app. Call when the user asks for the cheapest/sasta ride or mentions Ola, Uber or Rapido.',
    parameters: {
      type: 'object',
      properties: {
        pickup: { type: 'string', description: 'Pickup landmark or address' },
        drop: { type: 'string', description: 'Destination landmark or address' },
        category: { type: 'string', enum: ['bike', 'auto', 'cab', 'premium'], description: 'Vehicle category to compare (default cab)' },
      },
      required: ['pickup', 'drop'],
    },
  },
  {
    name: 'book_ride',
    description: 'Confirm and book a ride with an assigned driver and 4-digit OTP. Call when the user confirms they want to book a cab, auto, or bike.',
    parameters: {
      type: 'object',
      properties: {
        quoteId: {
          type: 'string',
          description: 'The quoteId returned by estimate_ride',
        },
        rideType: {
          type: 'string',
          enum: ['bike', 'auto', 'cab_economy', 'cab_premium'],
          description: 'Type of ride: bike, auto, cab_economy (Dropp Go), or cab_premium (Premier)',
        },
        pickup: { type: 'string', description: 'Pickup location if quoteId is not present' },
        drop: { type: 'string', description: 'Drop location if quoteId is not present' },
      },
      required: ['rideType'],
    },
  },
];

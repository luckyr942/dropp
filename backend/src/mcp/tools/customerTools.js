// Customer side of Dropp exposed over MCP: discover food, quote rides, and confirm a unified cart.
// Reuses Aura's tool handlers so an external agent and the voice assistant share one code path.
import { z } from 'zod';
import { safe } from '../mcpResult.js';
import { toolMap } from '../../aura/toolRegistry.js';
import { startSession, confirmSessionOrder } from '../../aura/auraService.js';
import { AuraSession } from '../../aura/sessionModel.js';
import { bookRide, getActiveRide, cancelRide } from '../../modules/rides/rideService.js';
import { getLatestActiveOrder } from '../../modules/orders/orderService.js';
import { orchestrateMultiServiceBooking } from '../../modules/orchestrator/orchestratorService.js';

export const DEFAULT_CUSTOMER_ID = 'cust_live_001';

const customer = {
  customerId: z.string().default(DEFAULT_CUSTOMER_ID).describe('Customer id. Defaults to the demo customer shown in the Dropp Customer app.'),
};

// One Aura session per customer keeps the draft order and ride quote together for confirm_booking.
const sessionFor = (customerId) => `mcp_${customerId}`;

async function ensureSession(customerId) {
  const sessionId = sessionFor(customerId);
  await startSession(sessionId, customerId);
  return sessionId;
}

const RIDE_TYPES = ['bike', 'auto', 'cab_economy', 'cab_premium'];

export function registerCustomerTools(server) {
  server.registerTool(
    'customer_search_restaurants',
    {
      title: 'Search restaurants & dishes',
      description: 'Find open restaurants by name, cuisine, or dish (e.g. "cold coffee", "Dosa King"). Returns restaurant ids with menu previews and prices.',
      inputSchema: { query: z.string().min(1), ...customer },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ query, customerId }) => {
      const sessionId = await ensureSession(customerId);
      return toolMap.search_restaurants({ query, sessionId });
    })
  );

  server.registerTool(
    'customer_get_menu',
    {
      title: 'Get restaurant menu',
      description: 'Full menu for one restaurant, using the id returned by customer_search_restaurants.',
      inputSchema: { restaurantId: z.string().min(1), ...customer },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ restaurantId, customerId }) => {
      const sessionId = await ensureSession(customerId);
      return toolMap.get_menu({ restaurantId, sessionId });
    })
  );

  server.registerTool(
    'customer_build_food_cart',
    {
      title: 'Build food cart',
      description: 'Create a draft food order with real catalogue prices. Nothing is placed until customer_confirm_booking. restaurant may be an id or a restaurant name.',
      inputSchema: {
        restaurant: z.string().min(1).describe('Restaurant id or name'),
        items: z
          .array(z.object({ name: z.string().min(1), quantity: z.number().int().min(1).max(20).default(1) }))
          .min(1),
        ...customer,
      },
    },
    safe(async ({ restaurant, items, customerId }) => {
      const sessionId = await ensureSession(customerId);
      return toolMap.build_draft({ restaurantId: restaurant, items, sessionId });
    })
  );

  server.registerTool(
    'customer_estimate_ride',
    {
      title: 'Estimate ride fares',
      description: 'Live road route, ETA and fares for bike, auto, cab_economy (Dropp Go) and cab_premium (Premier). The quote is held on the customer session for customer_confirm_booking.',
      inputSchema: {
        pickup: z.string().min(1).describe('Landmark or address, e.g. "Cyber Hub"'),
        drop: z.string().min(1).describe('Landmark or address, e.g. "Delhi Airport"'),
        ...customer,
      },
    },
    safe(async ({ pickup, drop, customerId }) => {
      const sessionId = await ensureSession(customerId);
      return toolMap.estimate_ride({ pickup, drop, sessionId });
    })
  );

  server.registerTool(
    'customer_compare_rides',
    {
      title: 'Compare ride apps',
      description:
        'Compare one trip across Dropp, Uber, Ola and Rapido, cheapest first. Dropp fares are live and bookable via customer_confirm_booking; other apps are rate-card estimates with a deep link to finish booking in that app.',
      inputSchema: {
        pickup: z.string().min(1),
        drop: z.string().min(1),
        category: z.enum(['bike', 'auto', 'cab', 'premium']).default('cab'),
        ...customer,
      },
    },
    safe(async ({ pickup, drop, category, customerId }) => {
      const sessionId = await ensureSession(customerId);
      return toolMap.compare_rides({ pickup, drop, category, sessionId });
    })
  );

  server.registerTool(
    'customer_confirm_booking',
    {
      title: 'Confirm cart (ride + food)',
      description:
        'Places whatever is pending on the customer session: the ride quote, the food draft, or both at once via the multi-service orchestrator. This dispatches a live offer to driver apps and notifies the customer app over WebSockets. Only call after the user has agreed to the fares.',
      inputSchema: {
        rideType: z.enum(RIDE_TYPES).default('cab_economy'),
        ...customer,
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    safe(async ({ rideType, customerId }) => {
      const sessionId = await ensureSession(customerId);
      const session = await AuraSession.findOne({ sessionId }).lean();
      const quoteId = session?.activeQuoteId || null;
      const draftOrderId = session?.draftOrderId || null;

      if (!quoteId && !draftOrderId) {
        throw new Error('Nothing to confirm. Call customer_estimate_ride and/or customer_build_food_cart first.');
      }

      let result;
      if (quoteId && draftOrderId) {
        const booking = await orchestrateMultiServiceBooking({
          customerId,
          sessionId,
          rideQuoteId: quoteId.toString(),
          rideType,
          draftOrderId: draftOrderId.toString(),
        });
        result = { kind: 'ride+food', ...booking };
      } else if (quoteId) {
        const ride = await bookRide({ customerId, quoteId: quoteId.toString(), rideType });
        result = { kind: 'ride', ride };
      } else {
        const order = await confirmSessionOrder(sessionId, draftOrderId.toString());
        result = { kind: 'food', order };
      }

      await AuraSession.updateOne({ sessionId }, { $set: { activeQuoteId: null, draftOrderId: null, stage: null } });
      return result;
    })
  );

  server.registerTool(
    'customer_get_status',
    {
      title: 'Track ride & order',
      description: "Current active ride (driver, OTP, status) and latest active food order for the customer.",
      inputSchema: { ...customer },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ customerId }) => {
      const sessionId = sessionFor(customerId);
      const [ride, order] = await Promise.all([
        getActiveRide(customerId),
        getLatestActiveOrder(customerId).then((o) => o || getLatestActiveOrder(sessionId)),
      ]);
      return { activeRide: ride || null, activeOrder: order || null };
    })
  );

  server.registerTool(
    'customer_cancel_ride',
    {
      title: 'Cancel ride',
      description: 'Cancel an active ride and release its driver.',
      inputSchema: { rideId: z.string().min(1), ...customer },
      annotations: { destructiveHint: true },
    },
    safe(({ rideId, customerId }) => cancelRide(rideId, customerId))
  );
}

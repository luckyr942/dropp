// Dropp MCP layer: one Model Context Protocol server that lets any AI agent (Claude, ChatGPT, Gemini,
// or our own Aura) act on all three sides of the marketplace — customer, merchant and driver — through
// the same services the mobile apps use. Every write fans out over WebSockets, so agent actions show
// up live on the customer, seller and driver apps.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCustomerTools } from './tools/customerTools.js';
import { registerMerchantTools } from './tools/merchantTools.js';
import { registerDriverTools } from './tools/driverTools.js';

const INSTRUCTIONS = `Dropp is a 3-sided hyper-local super-app (rides, food, grocery, parcels) in India.
Tools are grouped by side:
- customer_*: search restaurants, build a food cart, estimate rides, then customer_confirm_booking to place the ride, the food order, or both together.
- merchant_*: find a store, read its dashboard, manage live stock, and advance incoming orders.
- driver_*: see the fleet and pending dispatch offers, accept an offer, and move a trip to arrived / picked_up / completed.
Typical journey: customer_estimate_ride + customer_build_food_cart → (user agrees) → customer_confirm_booking → driver_list_offers → driver_accept_offer → driver_update_trip.
Always show fares and totals to the user and get their agreement before customer_confirm_booking. Amounts are in INR.`;

export function createDroppMcpServer() {
  const server = new McpServer({ name: 'dropp', title: 'Dropp', version: '1.0.0' }, { instructions: INSTRUCTIONS });
  registerCustomerTools(server);
  registerMerchantTools(server);
  registerDriverTools(server);
  return server;
}

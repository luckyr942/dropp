// End-to-end check of the Dropp MCP layer against a running backend.
// Walks the demo journey: merchant stock tweak → customer ride + food cart → confirm → driver accepts → trip done.
// Usage: node src/scripts/mcpSmokeTest.js [baseUrl]   (MCP_API_KEY env overrides the dev key)
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const baseUrl = process.argv[2] || 'http://localhost:4000';
const key = process.env.MCP_API_KEY || 'dropp-demo-mcp-key';

const client = new Client({ name: 'dropp-mcp-smoke-test', version: '1.0.0' });
await client.connect(
  new StreamableHTTPClientTransport(new URL('/mcp', baseUrl), {
    requestInit: { headers: { Authorization: `Bearer ${key}` } },
  })
);

async function call(name, args = {}) {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content?.[0]?.text ?? '';
  if (res.isError) throw new Error(`${name} → ${text}`);
  const data = JSON.parse(text);
  console.log(`✅ ${name}`);
  return data;
}

const { tools } = await client.listTools();
console.log(`🔧 ${tools.length} tools exposed\n`);

// Merchant: find a store and nudge one product's stock down and back up
const { stores } = await call('merchant_find_store', { query: '' });
if (stores.length) {
  const merchantId = stores[0]._id;
  console.log(`   store: ${stores[0].name}`);
  await call('merchant_dashboard', { merchantId });
  const { items } = await call('merchant_list_products', { merchantId, availability: 'in_stock', limit: 5 });
  const product = items.find((p) => p.stockQuantity > 0);
  if (product) {
    const down = await call('merchant_adjust_stock', { merchantId, productId: product._id, delta: -1 });
    console.log(`   ${product.name}: ${product.stockQuantity} → ${down.stockQuantity}`);
    await call('merchant_adjust_stock', { merchantId, productId: product._id, delta: 1 });
  }
}

// Customer: ride quote + food cart, then confirm both together
const quote = await call('customer_estimate_ride', { pickup: 'Cyber Hub', drop: 'Delhi Airport' });
console.log(`   ${quote.distanceKm} km, fares: ${quote.fares.map((f) => `${f.type} ₹${f.fare}`).join(', ')}`);
const { items: restaurants } = await call('customer_search_restaurants', { query: 'coffee' });
if (restaurants?.length) {
  const r = restaurants[0];
  const itemName = r.menuPreview?.[0]?.name || 'Cold Coffee';
  const draft = await call('customer_build_food_cart', { restaurant: r.id || r._id, items: [{ name: itemName, quantity: 2 }] });
  console.log(`   cart: 2 × ${itemName} from ${r.name} = ₹${draft.totalAmount ?? draft.order?.totalAmount ?? '?'}`);
}
const booking = await call('customer_confirm_booking', { rideType: 'cab_economy' });
console.log(`   booked: ${booking.kind} (${booking.status || booking.ride?.status || booking.order?.status})`);

// Driver: pick up the ride offer and run the trip to completion
const { offers } = await call('driver_list_offers');
const rideId = booking.rideId?.toString() || booking.ride?._id;
const offer = offers.find((o) => o.offerId === rideId) || offers.find((o) => o.serviceType === 'RIDE') || offers[0];
const { drivers } = await call('driver_list_fleet');
// Seeded drivers have no enabledServices list, which means "everything"
const canRide = (d) => !d.enabledServices || d.enabledServices.includes('RIDE');
let driver = drivers.find((d) => d.isOnline && !d.isBusy && canRide(d));
const borrowed = !driver;
// Nobody online: borrow a free cab driver for the test and put them back offline afterwards
if (borrowed) {
  driver = drivers.find((d) => !d.isBusy && String(d.vehicleType).startsWith('cab') && canRide(d));
  if (driver) await call('driver_set_online', { driverId: driver.driverId, online: true });
}
if (!offer || !driver) throw new Error(`No ${!offer ? 'ride offer' : 'free cab driver'} available for the dispatch step`);
await call('driver_accept_offer', { driverId: driver.driverId, offerId: offer.offerId });
// The driver gets the trip OTP from the rider, exactly like in the apps
const { activeRide } = await call('customer_get_status');
const otp = activeRide?.otp ?? offer.otp;
console.log(`   ${driver.name} accepted ${offer.serviceType} ${offer.offerId}, OTP ${otp}`);
await call('driver_update_trip', { driverId: driver.driverId, taskId: offer.offerId, status: 'arrived' });
await call('driver_update_trip', { driverId: driver.driverId, taskId: offer.offerId, status: 'picked_up', otp: String(otp) });
await call('driver_update_trip', { driverId: driver.driverId, taskId: offer.offerId, status: 'completed' });
if (borrowed && driver) await call('driver_set_online', { driverId: driver.driverId, online: false });

const status = await call('customer_get_status');
console.log(`   active ride: ${status.activeRide?.status ?? 'none'}, active order: ${status.activeOrder?.status ?? 'none'}`);

await client.close();
console.log('\n🎉 MCP journey complete');

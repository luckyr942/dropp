# Dropp Compare & Book — Plan

Aura compares one request across providers and books the best option:
- **Rides**: Dropp vs Uber vs Ola vs Rapido (and ONDC mobility apps like Namma Yatri).
- **Food**: Dropp vs Zomato vs Swiggy.

This builds on the MCP layer (`backend/src/mcp/`). Dropp already serves MCP to agents. Now it also becomes an MCP **client** of other providers.

---

## 1. What is actually possible today (checked Oct 2026)

| Provider | Official access | Can Dropp book it? |
|---|---|---|
| **Zomato** | Official MCP server at `https://mcp-server.zomato.com/mcp`: search, cart, checkout, order status. India only. User signs in with their own Zomato account (OAuth). | **Yes, today.** Orders are real and paid, and the MCP has no cancel tool. |
| **Swiggy** | **Builders Club** MCP servers: Food (`mcp.swiggy.com/food`), Instamart, Dineout. Invite-only: apply with use case, volume, and a demo video (builders@swiggy.in). Early testers reported a ₹1000 cap and COD only. | **Yes, after approval.** Apply now, since there is lead time. |
| **Uber** | No public booking API in India. Historic Rides API is partner-only. Universal deep link (`m.uber.com/ul/?action=setPickup…`) opens the app with pickup and drop pre-filled. | **Handoff only.** The user taps "Request" in Uber. |
| **Ola** | No open developer API. App deep links exist. | **Handoff only.** |
| **Rapido** | No public API. | **Handoff only** (open the app). |
| **ONDC Mobility** (Namma Yatri and others) | Open Beckn/ONDC protocol: search → select → init → confirm across every participating ride provider. Needs ONDC buyer-app registration. | **Yes, real bookings.** This matches the ONDC line in the pitch. |

**Out of scope:** scraping or automating the Ola, Uber or Rapido apps to read prices or press "book". It breaks their terms of service, breaks on every app update, and puts users' accounts at risk. Judges will ask about it. "We integrate via official MCP, ONDC and deep links" is the defensible answer.

So the honest product promise is:
- **Food**: compare and auto-book across Dropp, Zomato and Swiggy.
- **Rides**: compare and auto-book across Dropp and ONDC. Show estimated fares for Uber, Ola and Rapido, and hand off with one tap when they are cheapest.

---

## 2. Architecture

```
Aura (voice) ──┐
External agent ┤──> Dropp MCP (/mcp)  ──> compareService ──> ProviderAdapter[]
               │      compare_rides / compare_food / book_best      ├─ DroppRideAdapter / DroppFoodAdapter   (internal services)
               │                                                    ├─ ZomatoAdapter   (MCP client → mcp-server.zomato.com)
               │                                                    ├─ SwiggyAdapter   (MCP client → mcp.swiggy.com/food)
               │                                                    ├─ OndcRideAdapter (Beckn search/confirm)
               │                                                    └─ HandoffRideAdapter (Uber/Ola/Rapido: fare model + deep link)
               └──> ProviderAccount (per-user OAuth tokens, encrypted)
```

### Provider adapter contract (`backend/src/aggregator/providers/*.js`)

```js
{
  id: 'zomato', kind: 'food' | 'ride',
  capabilities: { quote: true, book: true, cancel: false, track: true, handoffOnly: false },
  isConnected(customerId),                 // has a valid OAuth token
  quote(request, ctx)  -> Quote[]          // normalised, see below
  book(quote, ctx)     -> Booking          // throws if handoffOnly
  status(bookingRef, ctx) -> Status
  handoffUrl?(quote)   -> string           // deep link for Uber/Ola/Rapido
}
```

### Normalised quote

```js
{
  provider: 'swiggy', quoteId, kind: 'food',
  total: 312,            // what the user actually pays: items + delivery + platform fee + taxes − discount
  breakdown: { items: 268, delivery: 25, platformFee: 10, taxes: 9, discount: 0 },
  etaMins: 28,
  confidence: 'live' | 'estimate',   // 'estimate' for handoff providers: never auto-book on it
  bookable: true,
  expiresAt,
  raw,                    // provider payload, kept server-side only
}
```

### Ranking (`compareService.js`)

- Sort by `total`. Treat options within ₹10 as a tie and break ties by ETA. The user can also set `priority: 'cheapest' | 'fastest' | 'balanced'`.
- Food matching: each provider's restaurant search returns different names. Match by restaurant name and distance, then fuzzy-match dishes. Reuse the alias logic in `resolveItemsByName`. Show "not available on Swiggy" instead of guessing.
- Every provider call has a timeout (~2.5s) and runs in parallel (`Promise.allSettled`). A slow or failed provider is dropped from the comparison, never blocks it.

### Auto-book rules (safety)

Auto-booking spends real money on third-party accounts, so it needs guard rails:
- **Only `confidence: 'live'` and `bookable: true` quotes** can be auto-booked. Estimates always become a one-tap handoff.
- **Standing consent**: the user turns on auto-book once and sets a per-order cap (e.g. ₹500). Above the cap, Aura asks: "Swiggy is cheapest at 312 rupaye, book karun?"
- **Re-quote before booking**: if the price moved by more than ₹10 or 5%, ask again.
- **No cancel on Zomato MCP**: tell the user before placing, and log the order so support can act.
- Store a `ComparisonSession` (request, all quotes, chosen quote, reason) for receipts and debugging.

### Accounts (`ProviderAccount` model)

- `{ customerId, provider, accessToken (AES-GCM encrypted), refreshToken, expiresAt, scopes }`.
- "Connect Zomato / Swiggy" screens in the customer app run the provider's OAuth flow. Tokens never reach the device or the LLM prompt.

---

## 3. New tools

Added to both Aura's `toolRegistry.js` and the Dropp MCP server:

| Tool | What it does |
|---|---|
| `compare_rides { pickup, drop, rideType?, priority? }` | Quotes from Dropp, ONDC and the handoff providers, ranked. |
| `compare_food { dishes[], restaurant?, priority? }` | Builds equivalent carts on Dropp, Zomato and Swiggy, ranked by real total. |
| `book_best { comparisonId, quoteId? }` | Books the winner, or the chosen quote. Handoff providers return a deep link instead. |
| `list_connected_providers` | Shows which accounts the user has linked. |

Aura example: *"Airport ke liye sabse sasta cab book kar do"* → `compare_rides` → *"Dropp 280, Namma Yatri 265, Uber around 310. Namma Yatri sabse sasta hai, book kar doon?"* → `book_best`.

---

## 4. Phased roadmap

| Phase | Scope | Est. | Done when |
|---|---|---|---|
| **0. Foundation** | `aggregator/` folder, adapter contract, `compareService`, `ComparisonSession` model. Dropp ride and food adapters wrap existing services. Add `compare_*` and `book_best` tools to MCP and Aura. | 2 days | `compare_rides` returns ranked Dropp tiers through MCP. |
| **1. Zomato (live)** | MCP client adapter (`@modelcontextprotocol/sdk` Client + Streamable HTTP + OAuth). `ProviderAccount` model plus a "Connect Zomato" screen. Dish matching. Cap-and-confirm booking. | 3–4 days | Aura compares Dropp vs Zomato for "2 cold coffee" and places a real Zomato order after confirmation. |
| **2. Swiggy** | **Apply to Builders Club on day 1** (demo video of phase 1 helps). Same MCP adapter pattern, so most code reuses the Zomato client. | 2 days after access | Three-way food comparison. |
| **3. Ride handoff** | `HandoffRideAdapter`: per-city fare models for Uber, Ola and Rapido (base + per-km + per-min, from public rate cards, labelled "estimate"). Deep links. "Open in Uber" button in the customer app. | 2 days | Ride comparison shows 4 providers; cheapest handoff opens the right app with pickup and drop filled. |
| **4. ONDC mobility** | Register as an ONDC buyer app (staging first). Beckn `search/select/init/confirm/status` callbacks. Adapter for live, bookable third-party rides. | 1–2 weeks (registration lead time) | A Namma Yatri ride booked from Aura. |
| **5. Auto-book & polish** | Consent and cap settings, re-quote check, receipts, comparison card UI in the Aura overlay, metrics (savings per user). | 3 days | "Auto-book cheapest under ₹500" works end to end, with a receipt. |

**Hackathon cut:** Phase 0 + Phase 1 + Phase 3 is about a week of work and gives a real, live demo: Zomato vs Dropp food comparison with an actual order, plus ride comparison with honest estimates and handoff. Mention Swiggy and ONDC as "integration in progress".

---

## 5. Files to add or change

- `backend/src/aggregator/providers/{droppRide,droppFood,zomato,swiggy,handoffRide,ondcRide}.js`
- `backend/src/aggregator/mcpClient.js`: shared client for external MCP servers (connect, OAuth token refresh, tool call with timeout)
- `backend/src/aggregator/compareService.js`, `matchItems.js`, `fareModels.js`
- `backend/src/aggregator/models/{providerAccount,comparisonSession}.js`
- `backend/src/aggregator/oauthRoutes.js`: `/api/providers/:id/connect` and `/callback`
- `backend/src/mcp/tools/compareTools.js`, plus a register call in `mcpServer.js`
- `backend/src/aura/toolRegistry.js`: compare and book tools, Gemini declarations
- `backend/src/aura/brain.js`: system prompt rules (always state each provider's price, never auto-book estimates)
- `frontend/shared/voice/`: comparison card; `frontend/` settings: connected accounts, auto-book cap

## 6. Risks

- **Real money and no cancel (Zomato):** always cap and confirm, and log every order.
- **Access lead time (Swiggy, ONDC):** apply immediately; the adapter pattern lets the rest ship without them.
- **Price parity is fuzzy:** the same dish differs across apps (portion size, restaurant branch). Show the matched item names, not just the total.
- **Estimates vs live:** never present an Uber, Ola or Rapido estimate as a live price. Label it in the UI and in Aura's speech.

# Dropp — What We Built & Demo Script

## 1. What's built (and working)

### One platform, three live apps
| App | What it does now |
|---|---|
| **Customer** | Rides, food, parcels. Floating **Aura** bubble on every screen. Live map tracking with the driver's real GPS. |
| **Seller** | Real login, live orders (accept → preparing → ready), real catalogue & stock, analytics. **Voice assistant**: "Maggi ka stock 20 kar do". |
| **Driver** | Live dispatch offers, first-to-accept wins, server-verified OTP, live navigation map, earnings credited on completion. |

### Aura — the AI layer
- **Cheapest Ride Finder.** "Cyber Hub se Airport sabse sasta cab book kar do": Aura compares Dropp's live fare with Uber, Ola and Rapido estimates. It books Dropp if it's cheapest, or opens the cheaper app with the trip pre-filled.
  - Dropp is priced about 10% under the competitor estimates.
  - Competitor prices are shown as "estimate", because none of those apps has a public booking API in India.
- **Multi-intent voice.** One sentence can book a cab and order coffee together. The orchestrator books both in parallel.
- **Seller voice.**
  - Pipeline: speech → Sarvam speech-to-text → store action → Sarvam Hinglish voice reply.
  - Common commands skip the AI and answer in about 1.5 to 2 seconds.
  - Open-ended requests go to Gemini.
  - Bolna AI live calls are wired in and switch on when the agent is deployed.

### MCP layer: any AI agent can run Dropp
- `POST /mcp` exposes **22 tools** across customer, merchant and driver.
- Claude, ChatGPT or Gemini can search, compare rides, book, manage stock and accept trips. The apps update live over WebSockets.
- Protected by a bearer key.

### Real-time backbone
- A ride starts as **searching**. The offer goes to driver apps, the **first accept wins** (atomic), and other drivers' popups close.
- **OTP** is checked on the server; the driver never sees it.
- Statuses: arrived → started → completed. Each one pushes live to the customer.
- **Demo safety net:** if no driver accepts within 40 s, a demo driver is assigned and drives the real route on the map. Rides survive server restarts.
- **Live maps:** Apple Maps in-app with the real road route, pickup and drop pins, and a moving car from real GPS.

### Fixed on the way
- "Airport" was geocoding to Kolkata (1,491 km away). It now resolves to Delhi Airport.
- Removed fake data: OTP 4821, "Captain Vikram", hardcoded fares, fake orders and stats, fake restaurants and menus.
- Cart "+" bug, mixed-restaurant carts, and a broken vehicle selector.

---

## 2. Pitch script (3:00)

> Layout on screen: **Customer (left) · Seller (middle) · Driver (right)**.
> Rule: when Aura speaks, stop talking.

### 0:00 – 0:25 · Hook
"You're in Gurgaon, running late for the airport. You open Uber, then Ola, then Rapido, comparing prices. Then Zomato for a coffee, and WhatsApp for the chemist. Five apps, five fees, and you still don't know if you got the best price.

Meanwhile your local shopkeeper loses up to 30% to aggregators, and has no time to update stock on an app.

This is **Dropp**: one super-app with an AI called **Aura** that works for all three sides. Customer on the left, store owner in the middle, driver on the right. All three are live, on one backend."

### 0:25 – 0:55 · The seller speaks to their store
*(Tap the seller's blue mic and say: "Maggi ka stock 20 kar do")*

"Shopkeepers don't type. They talk. Watch the store owner just say it."

*(Pause while Aura replies: "Maggi Masala Noodles ka stock ab 20 hai.")*

"That's speech-to-text in Hinglish, a real database update, and a spoken reply in about two seconds. Stock, prices, today's sales, accepting orders: all by voice."

### 0:55 – 1:35 · Aura finds the cheapest ride and books it
*(Customer: tap the green Aura bubble, say or type: "Cyber Hub se Airport sabse sasta cab book kar do")*

"Now the customer. One sentence."

*(Pause: comparison card appears, Aura speaks)*

"Aura just priced the trip across Dropp, Uber, Ola and Rapido on the real road route, about 11 kilometres. Dropp is cheapest at 196 rupees, so Aura booked it automatically. If another app were cheaper, Aura would open it with the trip already filled in. Aura works for the customer, not for us."

### 1:35 – 2:10 · Live three-way dispatch
*(Driver phone: offer pops up → tap Accept)*

"On the right, our driver gets the offer with the real fare and route, and no customer OTP, for safety. He accepts. If two drivers tap at once, only the first one wins."

*(Customer card flips to the driver's name, then tap "Track Ride Live on Map")*

"The customer instantly sees the driver, and here's the live map: the car is the driver's real GPS, streaming over WebSockets. The trip only starts when the driver enters the customer's OTP, and the server checks it."

### 2:10 – 2:35 · The secret sauce
"Two things make this different.

First, **Aura is an agent, not a chatbot.** It calls real tools: compare, book, dispatch, update stock. It uses Gemini for reasoning and Sarvam for Indian-language speech.

Second, we built an **MCP layer**. Dropp exposes 22 tools through the Model Context Protocol, so Claude, ChatGPT or any AI assistant can book a Dropp ride or run a Dropp store, with the same live updates you just saw."

### 2:35 – 3:00 · Business
"The model is simple:
- **Stores pay a flat 5%**, not 30%, and manage everything by voice.
- **Drivers earn across rides, food and parcels** from one app.
- **Customers always get the best price**, because Aura compares for them.

Next: ONDC mobility for real cross-network bookings, and Zomato and Swiggy through their MCP servers.

Dropp. One app, one AI, every side of the city. Thank you."

---

## 3. Demo checklist (before recording)
1. Backend running (`npm run dev --prefix backend`). Check that `curl localhost:4000/health` responds.
2. Three apps open:
   - Customer: iPhone 17 Pro on :8081
   - Seller: iPhone 17 Pro Max on :8084, logged in
   - Driver: iPhone 17 on :8082, showing ONLINE
3. Simulator GPS set to Cyber Hub: `xcrun simctl location <udid> set 28.4975,77.0850` for the driver and customer.
4. Close extra simulators (four at once overloaded the Mac).
5. Do one dry run, then record.

---

## 4. The demo video

`demo-video/Dropp-Hackathon-Demo.mp4`: 3:00, 1920×1080. The three phones are side by side (Customer · Merchant · Driver) and every take is real, recorded from the running apps.

| Time | On screen | Say (your script) |
|---|---|---|
| 0:00–0:40 | Three home screens. Title "One request. Multiple services." | **Phase 1: Hook** |
| 0:40–1:00 | Merchant highlighted: Amul Butter 20 → 15 | **Step 1: Merchant** |
| 1:00–1:28 | Customer opens Aura and asks for cab + 2 cold coffees. Aura says: *"Cyber Hub se Delhi Airport cab 196 rupaye, aur 2 Cold Coffee 228 rupaye. Dono confirm kar doon?"* | **Step 2: Customer and Aura** (stop talking while Aura speaks) |
| 1:28–1:50 | Confirm Both. Aura confirms with OTP 3581. Ride offer pops up on the driver phone and is accepted. | **Step 3: Live dispatch** |
| 1:50–2:11 | Customer card shows Anil Kumar, then live map with the car moving and "LIVE" | "…updates through our real-time layer…" |
| 2:11–2:37 | Slide: Aura · Orchestration · Real-time backbone | **Phase 3** |
| 2:37–3:00 | Slide: Business & Vision and tagline | **Phase 4** |

The video has Aura's voice but no narration. Record your voiceover over it with QuickTime, iMovie, CapCut or Loom.

To rebuild after a new take, from `demo-video/`:
```
swift compose.swift .
```

### Submitting
- **Submission link:** your GitHub repo URL. Push first, and remove the test seller password from `frontend/seller/.env.example`.
- **Pitch video link:** upload the MP4 (with your voiceover) to Google Drive. Set Share → General access → "Anyone with the link" → Viewer, and paste that link.

---

## 5. What to build next (roadmap)

**Next 2 weeks (make the demo bulletproof)**
1. **Customer identity.** One customer ID everywhere (Aura currently uses a shared default), plus phone-OTP login.
2. **Delivery coordinates on orders.** So the food-tracking map shows the real drop pin and the delivery partner live.
3. **Bolna live voice for sellers.** Deploy the backend publicly, run `npm run voice:setup`, and get full-duplex calls.
4. **Upgrade the Gemini SDK.** Current models reject the old SDK's tool-call format; this affects customer Aura too.

**Next 1–3 months (product)**

5. **Real cheapest-price booking.** Zomato MCP (live today) and Swiggy Builders Club for food; ONDC Mobility (Namma Yatri) for real cross-network rides. Plan in `docs/aggregator_plan.md`.
6. **Payments.** UPI intent and wallet, merchant payouts, and driver earnings settlement.
7. **Smart dispatch.** Nearest-driver matching with Redis GEO instead of a broadcast, batching food plus ride pickups along one route, and surge-aware pricing.
8. **Seller growth tools.** Voice "restock alerts", auto-reorder from distributors, daily sales summary on WhatsApp, and catalogue import from a photo of the shelf.

**3–6 months (scale & trust)**

9. **Safety.** SOS with live trip sharing, driver KYC, and ride recording consent.
10. **Multilingual Aura.** Tamil, Telugu, Bengali and Marathi via Sarvam.
11. **Agent ecosystem.** Publish the Dropp MCP server so Claude, ChatGPT and Gemini users can book Dropp directly.
12. **Operations.** Admin dashboard, fraud checks, and analytics on order and dispatch times.

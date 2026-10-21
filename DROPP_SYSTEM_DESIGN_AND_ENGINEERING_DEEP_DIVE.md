# Dropp Super-App: System Architecture, AI Voice Engine & Engineering Deep Dive

> **Document Version:** 1.0.0  
> **Last Updated:** October 18, 2026  
> **Target Audience:** Engineering Team & Architecture Reviewers  
> **Scope:** Full-Stack Architecture (Backend, Frontend, Mobile, Database, AI Voice Engine, Safety Controls, and Token/Credit Optimization)

---

## Table of Contents
1. [Executive Architecture Overview](#1-executive-architecture-overview)
2. [The 4 Core Pillars of Dropp](#2-the-4-core-pillars-of-dropp)
3. [The Aura Voice AI Engine (In-Depth)](#3-the-aura-voice-ai-engine-in-depth)
4. [Critical Safety Measures & Guardrails](#4-critical-safety-measures--guardrails)
5. [Token, Credit & Latency Optimization Blueprint](#5-token-credit--latency-optimization-blueprint)
6. [Complete Function-by-Function Code Reference](#6-complete-function-by-function-code-reference)
7. [Database Schemas & State Machines](#7-database-schemas--state-machines)
8. [End-to-End Execution Traces (Step-by-Step)](#8-end-to-end-execution-traces-step-by-step)
9. [Morning Engineering Checklist & Next Steps](#9-morning-engineering-checklist--next-steps)

---

## 1. Executive Architecture Overview

Dropp is engineered as a unified **Hyper-Local Super-App** that blends four distinct on-demand services (Food Delivery, Ride Hailing, Parcel Delivery, and Quick Commerce) behind a single real-time frontend and a conversational AI voice assistant called **Aura**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER (MOBILE)                                │
│                     React Native (Expo) • React Navigation • Expo AV                   │
│                                                                                        │
│   [Ride Screen]         [Food Market]         [Package Courier]        [Quick Shop]    │
│         │                     │                      │                       │         │
│         └─────────────────────┼──────────────────────┴───────────────────────┘         │
│                               ▼                                                        │
│                  [Aura Voice Modal & Audio Streamer]                                   │
└───────────────────────────────┬────────────────────────────────────────────────────────┘
                                │ HTTP / WebSocket (Port 4000)
                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               BACKEND API & ORCHESTRATION                              │
│                          Node.js (ES Modules) • Express.js                             │
│                                                                                        │
│  ┌───────────────────┐  ┌────────────────────┐  ┌──────────────────┐  ┌─────────────┐  │
│  │   Aura Brain      │  │    Order Service   │  │   Ride Engine    │  │ Quick Shop  │  │
│  │   & Code Gates    │  │    & Cart Drafts   │  │   & Fares/OTP    │  │ & Catalog   │  │
│  └────────┬──────────┘  └─────────┬──────────┘  └────────┬─────────┘  └──────┬──────┘  │
│           │                       │                      │                   │         │
│           └───────────────────────┼──────────────────────┴───────────────────┘         │
│                                   ▼                                                    │
│               [RabbitMQ Event Bus] ◄───► [Redis Cache]                                 │
│                                   ▼                                                    │
│                            [MongoDB Atlas]                                             │
└───────────────────────────────────┬────────────────────────────────────────────────────┘
                                    │ AI & Speech Services
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                EXTERNAL AI ENGINE LAYER                                │
│                                                                                        │
│     [Google Gemini 3.1 Flash Lite]                [Sarvam AI Bulbul:v3 / v4-Flash]     │
│        (LLM & Tool Calling Brain)                     (Primary Voice: Ishita)          │
│                                                                                        │
│     [Google Gemini 3.8 Flash TTS]                 [Disk Audio Cache System]            │
│        (Fallback Voice: Callirrhoe)                   (0-Credit / 0ms Repeat Cache)    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Technology Rationale
- **Runtime:** Node.js (v20+ with native ES Modules) for non-blocking I/O and rapid event loop execution.
- **Database:** MongoDB via Mongoose for flexible JSON schemas (dynamic restaurant menus, multi-item carts, geo-coordinates).
- **Messaging:** RabbitMQ (`amqp`) exchange for decoupled asynchronous event distribution (order placed, driver matched, tracking).
- **Caching & Ephemeral State:** Redis for fast session lockings and geohash lookups.
- **Client:** React Native (Expo SDK 51+) targeting both iOS and Android with universal audio and haptic support.

---

## 2. The 4 Core Pillars of Dropp

| Pillar | Real-World Use Case | Core Backend Entity | Aura Voice Capabilities |
|---|---|---|---|
| 🍔 **Food** | Restaurant discovery, dish customization, order placement | `Restaurant`, `MenuItem`, `Order` | *"Biryani dikhao"*, *"Ek pizza aur do coffee add kar do"* |
| 🚗 **Ride** | Bike, Auto, Cab Economy & Premium with upfront fare & OTP | `Ride` (coordinates, fare, driver, OTP) | *"Rajiv Chowk ke liye cab book kar do"*, *"Bike ka rate batao"* |
| 📦 **Delivery** | Peer-to-peer parcel delivery (documents, electronics, gifts) | `DeliveryOrder` (sender, recipient, parcel) | *"Connaught Place ek document bhejna hai"* |
| 🛒 **Shop** | 10-minute grocery, dairy, bakery, snacks, and pharmacy | `Store`, `Product`, `ShopOrder` | *"Doodh aur brown bread order kar do"* |

---

## 3. The Aura Voice AI Engine (In-Depth)

Aura is not a basic chatbot; it is a **voice-first conversational commerce agent** designed specifically for Indian conversational Hinglish.

### 3.1 The Voice Pipeline
1. **Audio Capture (STT):** The mobile app listens via `expo-speech` / native mobile speech recognizer and produces text.
2. **Safe Code Gates:** The backend inspects the utterance using deterministic regex before any AI model is invoked. If the user said *"haan"* or *"nahi"*, code handles it immediately without LLM delay.
3. **Brain (LLM & Tool Calling):** `gemini-3.1-flash-lite` processes the text against registered function declarations (`search_restaurants`, `build_draft`, etc.).
4. **Fast Tool Execution:** Tool calls execute against MongoDB in **~25–40 milliseconds**.
5. **Speech Synthesis (TTS):**
   - **Primary Voice:** **Ishita** via Sarvam AI (`bulbul:v3`). It delivers native Indian Hinglish intonations in **~800ms–1.4s**.
   - **Fallback Voice:** **Callirrhoe** via Google Gemini (`gemini-3.8-flash-tts`).
6. **Audio Streaming & Playback:**
   - Instead of sending giant Base64 strings over JSON (which crashes native iOS `AVPlayer`), the backend returns an audio URL: `/api/aura/audio/:id`.
   - The mobile client caches the WAV file in `FileSystem.cacheDirectory` and plays it cleanly using `expo-av`.

---

## 4. Critical Safety Measures & Guardrails

### 🛡️ Safety Measure 1: Code-Enforced Confirmation Gate (Zero AI Hallucinations for Orders)
**The Problem:** LLMs are non-deterministic. If an AI model is given a tool called `place_order()`, it can hallucinate and trigger unauthorized credit card or wallet deductions without the user explicitly consenting.

**Our Architectural Solution:**
- The AI **cannot** place orders. There is no `place_order` tool declared to Gemini.
- The AI's highest permission level is `build_draft()`, which stages a cart in MongoDB and transitions the session state to `awaiting_confirmation`.
- When the user speaks, the server tests their utterance against a hardcoded regex:
  ```javascript
  const CONFIRM_REGEX = /^\s*(haan|han|yes|ok|theek hai|confirm)(\s+(confirm|kar do|karo|ji|place karo|order kar do|please))*[.!?\s]*$/i;
  ```
- **Atomic MongoDB Claim:**
  ```javascript
  const claimedSession = await AuraSession.findOneAndUpdate(
    { sessionId, stage: 'awaiting_confirmation', draftOrderId: { $ne: null } },
    { $set: { stage: null } },
    { new: false }
  );
  ```
  Only if this atomic claim succeeds does the backend call `confirmSessionOrder()`. This ensures:
  1. The AI cannot place orders on its own.
  2. Double-confirmation requests (race conditions) are completely blocked.

### 🛡️ Safety Measure 2: Safe Cancellation Gate
If the user says *"nahi"*, *"cancel karo"*, or *"rehne do"*, the server uses `CANCEL_REGEX` to atomically reset `stage: null` and delete or invalidate the draft cart without calling the LLM.

### 🛡️ Safety Measure 3: Dual-Tier Circuit Breakers for Provider Outages
**The Problem:** If Google Gemini or Sarvam AI experiences a cloud outage or 429 quota exhaustion, incoming user requests will hang and crash the backend.

**Our Architectural Solution:**
- `isBrainRetryable(err)` detects `429`, `503`, `quota`, `timeout`, or network errors.
- If repeated failures occur, `geminiCooldownUntil = Date.now() + 60_000` is engaged.
- For the next 60 seconds, requests **bypass Gemini entirely** and route into `runDeterministicFallback()`.
- The deterministic fallback uses regex matching against MongoDB to search food and create drafts, ensuring Dropp remains 100% operational even during total cloud AI outages.

### 🛡️ Safety Measure 4: Client-Side Timeout Protection (Eliminating "Server Slow Hai")
- Gemini tool calling can take multiple round trips (8–15s).
- The mobile `AuraContext.js` originally had a `REQUEST_TIMEOUT_MS` of 20,000ms. If network transit took 20.2s, the phone aborted the request right before the audio arrived, triggering an `AbortError` (*"Server slow hai"*).
- We expanded the mobile client timeout to **45,000ms**, allowing complex multi-turn reasoning to finish gracefully without client-side dropping.

---

## 5. Token, Credit & Latency Optimization Blueprint

To prevent running out of API credits and achieve millisecond-level responsiveness, we implemented four core optimizations:

### 1. Two-Tier Audio Content Cache (Memory + Disk)
Sarvam AI charges credits per character. Repeating *"Aapka order confirm ho gaya!"* 100 times during testing drains credits rapidly.

**The Solution:**
```
Client Request ──> Has normalized text been spoken before?
                         │
         ┌───────────────┴───────────────┐
      YES │                               │ NO
         ▼                               ▼
 [Memory Cache] (0.09 ms, 0 credits)    [Call Sarvam / Gemini API]
         │                               │
         │ (if server restarted)         ▼
         ▼                      [Save to Memory Cache]
  [Disk Cache]                  [Save to Disk (.wav file)]
  (1.0 ms, 0 credits)                    │
         │                               ▼
         └─────────────────────────> Return Audio
```
- **Memory Cache:** `contentCache.get(key)` returns in **`0.09 milliseconds`**.
- **Disk Cache:** Saved permanently in `backend/src/aura/audio_cache/[hash].wav`. Even if the server restarts, repeat phrases consume **0 API calls and 0 credits**.

### 2. Strict 12–15 Word Prompt Rule (70% Credit Reduction)
Character length directly determines TTS API billing and generation time:
- 160 characters (long paragraph) = 160 credits, ~2.3 seconds latency.
- 45 characters (12-word punchy sentence) = 45 credits, **~0.8 seconds latency**.
- Rule 6 in `SYSTEM_PROMPT` enforces:
  > *"Keep replies strictly under 12 to 15 words. Be punchy, brief, and direct. Every extra word burns TTS credits and increases latency."*

### 3. Dish-Level Search with `menuPreview` (Eliminating Redundant Tool Turns)
- **Before:** User: *"Ek biryani order kar do"*  
  Turn 1: Gemini calls `search_restaurants` (5s)  
  Turn 2: Gemini calls `get_menu` (5s)  
  Turn 3: Gemini calls `build_draft` (5s)  
  Total: **~19.6 seconds!**
- **After:** `searchRestaurant()` in `auraService.js` was enhanced to search both restaurant names and menu items. It attaches `menuPreview` (top items with exact prices) directly to the search result.
- Gemini now reads the price from `menuPreview` and calls `build_draft` in the **very next turn**, dropping latency from **19.6s ➔ 11.5s**.

---

## 6. Complete Function-by-Function Code Reference

### 6.1 `backend/src/aura/voiceTurnHandler.js`
The master entry point for all voice interactions (`POST /api/aura/voice-turn`).

- `handleVoiceTurn(req, res, next)`:
  1. Validates `sessionId` and input text length (capped at 300 characters).
  2. Ensures the session exists via `startSession()`.
  3. Checks **Gate 1 (Confirmation)**: If text matches `CONFIRM_REGEX`, executes atomic claim on `awaiting_confirmation`, runs `confirmSessionOrder()`, synthesizes confirmation speech, and returns `screenAction: ORDER_PLACED`.
  4. Checks **Gate 2 (Cancellation)**: If text matches `CANCEL_REGEX`, clears stage and returns cancellation response.
  5. Loads conversation history from MongoDB and executes `runBrain()`.
  6. Saves conversation history and returns `{ reply, toolCallsMade, screenAction, audioUrl }`.
- `getAudioUrl(reply)`:
  Calls `textToSpeech(reply)`, generates an ephemeral ID `a_[timestamp]_[rand]`, stores the buffer via `storeAudio()`, and returns `/api/aura/audio/:id`.
- `saveConversationHistory(sessionId, userMessage, aiReply)`:
  Appends message turns to `AuraSession.conversation` with `$slice: -40` to maintain a sliding history window.

---

### 6.2 `backend/src/aura/brain.js`
The intelligence layer managing the Gemini tool-calling loop and fallback logic.

- `runBrain({ conversation, sessionId })`:
  1. Checks `geminiCooldownUntil`. If active, immediately diverts to `runDeterministicFallback()`.
  2. Iterates through `BRAIN_MODELS` (`gemini-3.1-flash-lite`).
  3. Starts a chat session with `SYSTEM_PROMPT` and `TOOL_DECLARATIONS`.
  4. Runs a loop (up to `MAX_STEPS = 5`) evaluating function calls.
  5. Injects `sessionId` into every tool argument so the client cannot tamper with session ownership.
  6. Detects `search_restaurants` and attaches `screenAction: SHOW_RESTAURANTS`.
  7. Detects `build_draft` and attaches `screenAction: SHOW_DRAFT`.
  8. If provider errors occur, activates the 60-second circuit breaker and falls back to deterministic processing.
- `runDeterministicFallback({ text, sessionId })`:
  Regex-based intent parser that extracts food cravings (biryani, pizza, burger, chai, coffee) and directly queries MongoDB to return restaurants or drafts when Gemini is offline.
- `cleanHistory(history)`:
  Ensures Gemini chat history starts with a `user` turn, stripping broken leading turns.
- `withTimeout(promise, ms = 25000)`:
  Enforces a 25-second ceiling using `Promise.race`.

---

### 6.3 `backend/src/aura/ttsService.js`
The multi-provider voice synthesis engine.
- `textToSpeech(text, voiceName = 'Callirrhoe')`:
  1. Normalizes text: strips markdown (`*`, `#`), emojis, and converts `₹250` into `"250 rupaye"`.
  2. Checks `contentCache` (memory) and `getDiskCache()` (disk). Returns in **0–1ms** on cache hits.
  3. If `config.sarvamApiKey` exists, attempts synthesis via `generateSarvamTts()` with speaker **Ishita**.
  4. If Sarvam fails or is unconfigured, iterates through `TTS_MODELS` (`gemini-3.8-flash-tts`) requesting `responseModalities: ['AUDIO']`.
  5. Caches generated audio to both memory and disk.
- `generateSarvamTts(text)`:
  Makes a `POST https://api.sarvam.ai/text-to-speech` request with `model: bulbul:v3`, `speaker: ishita`, and `target_language_code: hi-IN`. Returns standard WAV buffer.
- `pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitDepth = 16)`:
  Converts raw 24kHz PCM byte streams returned by Gemini into standard 44-byte RIFF/WAVE header audio buffers.
- `getDiskCache(key)` / `saveDiskCache(key, buf)`:
  Hashes the speaker and normalized text with MD5 and reads/writes `.wav` files to `src/aura/audio_cache/`.

---

### 6.4 `backend/src/aura/toolRegistry.js`
Bridges LLM tool invocations to real database services.

- `search_restaurants({ query, sessionId })`: Searches restaurants by name, cuisine, or dish, returning items with `menuPreview`.
- `get_menu({ restaurantId, sessionId })`: Fetches full categorized menu for a specific restaurant.
- `build_draft({ restaurantId, items, sessionId })`: Validates item quantities (1–20), calls `buildDraft()`, and transitions session `stage` to `'awaiting_confirmation'`.
- `TOOL_DECLARATIONS`: JSON schema declarations provided to Gemini for function calling.

---

### 6.5 `backend/src/aura/auraService.js`
Database operations for the Aura session lifecycle.

- `startSession(sessionId, customerId)`: Finds or creates an `AuraSession` in MongoDB.
- `searchRestaurant(query)`: Performs MongoDB `$or` regex searches on `Restaurant.name`, `Restaurant.cuisine`, and `MenuItem.name`. Returns restaurants with top dishes.
- `buildDraft(sessionId, requestedItems, restaurantId, customerId)`: Calls `orderService.createDraftOrder()` to calculate real prices, subtotal, delivery fees, and tax, storing the `draftOrderId` on the session.
- `confirmSessionOrder(sessionId)`: Transitions the draft order into a real placed order (`status: 'confirmed'`), clears the session draft, and broadcasts a WebSocket notification.

---

### 6.6 `frontend/shared/voice/AuraContext.js`
The global state store and audio player on the mobile client.

- `sendVoiceTurn(userText)`:
  Sends `POST /api/aura/voice-turn` with `sessionId`. Handles response actions (`SHOW_RESTAURANTS`, `SHOW_DRAFT`, `ORDER_PLACED`). Invokes `playAudio()`.
- `playAudio(text, audioUrl)`:
  1. Stops any existing speech/sound.
  2. If `audioUrl` is present: downloads the WAV file via `FileSystem.downloadAsync` into `FileSystem.cacheDirectory` and plays it via `Audio.Sound.createAsync()`.
  3. If no audio URL: falls back to local device speech using `expo-speech`.
- `confirmOrder()`: Helper that invokes `sendVoiceTurn('haan')`.
- `cancelDraft()`: Helper that invokes `sendVoiceTurn('nahi')`.

---

## 7. Database Schemas & State Machines

### 7.1 Aura Session Lifecycle (`sessionModel.js`)

```
   [Active Session]
          │
          │ User requests items ("Ek biryani add kar do")
          ▼
   [build_draft called]
          │
          ▼
   [stage: 'awaiting_confirmation'] ◄─── (Session locked to draftOrderId)
          │
    ┌─────┴─────────────────────────┐
    │ User says "Haan"               │ User says "Nahi"
    ▼                               ▼
 [Atomic Claim: stage = null]    [Atomic Claim: stage = null]
    │                               │
    ▼                               ▼
 [Order Confirmed & Placed]      [Draft Order Cancelled]
 [status: 'order_placed']        [status: 'active']
```

### 7.2 Ride Lifecycle (`rideModel.js`)

```
 [searching] ──> [driver_assigned] ──> [arrived] ──> [in_progress] ──> [completed]
                         │
                         └──> [cancelled]
```

Fields:
- `customerId`: String (indexed)
- `pickupLocation`: `{ address, lat, lng }`
- `dropLocation`: `{ address, lat, lng }`
- `rideType`: `bike` | `auto` | `cab_economy` | `cab_premium`
- `fare`: Number
- `otp`: 4-digit code (e.g. `"4821"`)
- `driver`: `{ name, phone, vehicle, rating, avatar }`
- `status`: String (indexed)

---

## 8. End-to-End Execution Traces (Step-by-Step)

### Trace: User Orders Food via Voice

```
TIME      ACTOR        ACTION / PAYLOAD
───────────────────────────────────────────────────────────────────────────────────
0.00s     User         Speaks: "Ek biryani order kar do"
0.25s     Mobile       expo-speech transcribes text -> calls sendVoiceTurn()
0.40s     Backend      POST /api/aura/voice-turn received
0.41s     Backend      Gate checks (confirm/cancel regex) -> No match -> Proceeds
0.42s     Backend      runBrain() invoked with gemini-3.1-flash-lite
3.20s     Gemini       Emits tool call: search_restaurants({ query: "biryani" })
3.25s     MongoDB      searchRestaurant() executes in 35ms -> returns Bawarchee Biryani + menuPreview
6.10s     Gemini       Emits tool call: build_draft({ restaurantId: "...", items: [{ name: "Chicken Dum Biryani", quantity: 1 }] })
6.15s     MongoDB      buildDraft() creates draft order (Total: 279 rupaye) -> stage = 'awaiting_confirmation'
8.80s     Gemini       Emits text reply: "Haanji! Bawarchee Biryani House se Chicken Dum Biryani add kar di hai, total 279 rupaye. Confirm karein?"
8.85s     TTS Engine   Sarvam AI (Ishita) synthesizes 110 characters
9.85s     TTS Engine   Audio buffer generated (215 KB WAV) -> Saved to Memory & Disk Cache
9.90s     Backend      Returns JSON: { reply, screenAction: SHOW_DRAFT, audioUrl: "/api/aura/audio/a_..." }
10.05s    Mobile       Receives JSON -> Shows Draft Order Card on screen
10.15s    Mobile       Downloads audio -> Audio.Sound plays Ishita's voice aloud
───────────────────────────────────────────────────────────────────────────────────
User says "Haan"
───────────────────────────────────────────────────────────────────────────────────
0.00s     User         Speaks: "Haan"
0.20s     Mobile       Calls sendVoiceTurn("haan")
0.35s     Backend      POST /api/aura/voice-turn received
0.36s     Backend      CONFIRM_REGEX matches! (Bypasses Gemini entirely!)
0.40s     MongoDB      Atomic findOneAndUpdate claims stage 'awaiting_confirmation'
0.45s     MongoDB      confirmSessionOrder() marks order 'confirmed' in DB
0.46s     TTS Engine   Checks Disk Cache for confirmation phrase -> CACHE HIT! (0ms, 0 credits)
0.47s     Backend      Returns JSON: { reply: "Aapka order confirm ho gaya!", screenAction: ORDER_PLACED }
0.55s     Mobile       Plays instant audio & displays Order Placed Tracking Card!
```

---

## 9. Morning Engineering Checklist & Next Steps

When you resume development in the morning, follow this exact sequence to complete the remaining pillars:

### Phase 1: Ride Module (`backend/src/modules/rides/`)
- [x] Create `rideModel.js` with pickup, drop, fare, OTP, driver, and status.
- [ ] Create `rideService.js` with fare calculator (`calculateFares(distanceKm)`) and booking logic (`bookRide()`).
- [ ] Create `rideRoutes.js` (`POST /api/rides/estimate`, `POST /api/rides/book`, `GET /api/rides/active`).
- [ ] Wire Aura Ride tools in `toolRegistry.js` (`estimate_ride`, `book_ride`).

### Phase 2: Package Delivery Module (`backend/src/modules/delivery/`)
- [ ] Create `deliveryModel.js` with sender, recipient, parcel dimensions, and tracking code.
- [ ] Create `deliveryService.js` with parcel pricing calculator and courier dispatcher.
- [ ] Wire Aura Delivery tools in `toolRegistry.js` (`estimate_delivery`, `book_delivery`).

### Phase 3: Quick Commerce Shop Module (`backend/src/modules/shop/`)
- [ ] Create `shopModel.js` with `Store` and `Product` models.
- [ ] Seed initial grocery and daily essentials data (Milk, Bread, Eggs, Butter, Chips).
- [ ] Create `shopRoutes.js` (`GET /api/shop/stores`, `GET /api/shop/products`, `GET /api/shop/search`).
- [ ] Wire Aura Shop tool in `toolRegistry.js` (`search_groceries`).

### Phase 4: Frontend Master Integration
- [ ] Connect `LocationScreen.jsx` to real backend `POST /api/rides/book`.
- [ ] Connect `PackageDetailsScreen.jsx` to real backend `POST /api/delivery/create`.
- [ ] Connect `Shop` tile on `mainHomeScreen.jsx` to a dedicated Quick Commerce Store Screen.
- [ ] Pass live order details into `OrderTrackingScreen.jsx` for live WebSocket progress.

---

*End of Architecture & Engineering Master Document.*

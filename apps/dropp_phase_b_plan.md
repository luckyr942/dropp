# Dropp Aura: Milestone Report & Phase B Blueprint

## 📍 Where We Are Right Now (Phase A Completed & Verified)

### 1. Completed & Live-Tested Backend Architecture
- **`sessionModel.js`**: Added `stage: [null, 'awaiting_confirmation']` and server-capped `conversation: [Mixed]`.
- **`toolRegistry.js`**: Verified tool mappings for `search_restaurants`, `get_menu`, and `build_draft`. 
  - Sanitizes quantities (1–20).
  - Enforces server `sessionId` (Gemini cannot switch sessions).
  - Keeps order confirmation **out** of the LLM tool declarations.
- **`brain.js`**:
  - Primary: Gemini tool-calling loop (capped at 5 steps, with timeout & circuit breaker).
  - Fallback: Offline deterministic parser (₹0 cost, protects against quota drops or 429 errors).
  - Preserves drafts even if Gemini hits an error after tool execution.
- **`voiceTurnHandler.js`**:
  - Code-level confirmation gate (`CONFIRM_REGEX`) intercepts `"haan"`, `"yes confirm"`, placing orders deterministically.
  - Code-level cancellation gate (`CANCEL_REGEX`) cancels drafts cleanly on `"nahi"`, `"cancel karo"`.
  - Atomically claims the confirmation stage (idempotent, prevents double orders).
  - Server-managed history capped to last 40 turns in MongoDB.
- **`main.js`**:
  - `trust proxy` enabled for deployment.
  - Tiered rate limiting: 500 req/15m for API, strict 20 req/min for `/voice-turn`.
  - Live console request logger with status and latency.
  - Hardened graceful shutdown (`server.closeAllConnections()`).
- **Live Test Verified**: Tested via `curl` with real database catalog, confirmed draft creation and status updates to `"confirmed"`.

---

## 🏗️ Phase B: Global Frontend Voice Layer (What You Will Write Next)

Instead of hardcoding voice logic into every single screen, we create a unified **Global Aura Layer** in `frontend/shared/voice/` that wraps the whole app once at `frontend/App.js`.

### The 3 Frontend Files You Will Write:

```
frontend/shared/voice/
  ├── AuraContext.js       ← React Context & state manager (session, audio status, screenAction dispatcher)
  ├── useAura.js           ← Custom hook for components/screens to interact with Aura
  └── AuraOverlay.jsx      ← Floating animated mic button + slide-up voice modal
```

---

### Step-by-Step Breakdown of Phase B

#### Step 1: `frontend/shared/voice/AuraContext.js`
- **What it does**: Holds global state:
  - `isOpen`: boolean (modal visibility)
  - `isListening`: boolean (mic recording)
  - `isThinking`: boolean (waiting for backend response)
  - `isSpeaking`: boolean (text-to-speech playing)
  - `sessionId`: string (persisted UUID for conversation thread)
  - `messages`: array of `{ role, text }` for displaying live captions
  - `draftOrder`: current working cart draft from `SHOW_DRAFT` screen action
- **Function**: `sendVoiceTurn(text)`:
  - Dispatches `POST http://<IP>:4000/api/aura/voice-turn`
  - Plays the spoken response using `expo-speech`
  - Dispatches screen actions (`SHOW_RESTAURANTS`, `SHOW_DRAFT`, `ORDER_PLACED`) to navigation

#### Step 2: `frontend/shared/voice/useAura.js`
- **What it does**: A lightweight hook `const { openAura, isListening, sendVoiceTurn } = useAura()` so that:
  - The bottom navigation bar's center Aura button can open the modal from any screen.
  - Any screen can read current voice state.

#### Step 3: `frontend/shared/voice/AuraOverlay.jsx`
- **What it does**: The visual UI rendered once in `App.js`:
  - A floating mic trigger or center nav tap.
  - Beautiful glassmorphic modal with glowing audio orb animation.
  - Live transcript bubble ("Aap kya khana chahenge?").
  - Quick draft card when food is selected.
  - "Confirm Order" button that calls the confirmation route.

#### Step 4: Wire into `frontend/App.js`
- Wrap app with `<AuraProvider>`:
```jsx
<AuraProvider onNavigate={setCurrentScreen}>
   {/* Existing screens */}
   <AuraOverlay />
</AuraProvider>
```

---

## What to Do Right Now
We will create the directory `frontend/shared/voice/` and guide you through writing **File 1 (`AuraContext.js`)** line by line.

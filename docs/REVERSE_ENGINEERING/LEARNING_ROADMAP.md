# Dropp — Reverse Engineering & Mastery Learning Roadmap

This roadmap takes you from the core foundation of how Dropp works to mastering state management, animations, geospatial indexing, event-driven messaging, and backend API architecture.

---

## 🗺️ Step-by-Step Curriculum

### Module 1: Foundational Architecture & Shared Domain Core
- **Lesson 1.1**: The Monorepo topology (`pnpm-workspace.yaml`, `package.json`, `@dropp/types`, `@dropp/events`).
- **Lesson 1.2**: Domain modeling: Ride lifecycle states, Driver availability, and Domain Event envelopes.
- **Lesson 1.3**: The Shared UI System: Design tokens, semantic colors, and Dark/Light Mode Context.

### Module 2: The Global State Machine (Zustand & Telemetry)
- **Lesson 2.1**: Dissecting `useRideStore`: State schema, actions, and immutability.
- **Lesson 2.2**: Cross-screen state propagation: From location inputs to trip tracking.
- **Lesson 2.3**: Security in state: Delivery OTP generation and verification mechanics.

### Module 3: Rider App Deep Dive
- **Lesson 3.1**: Entry point & custom navigation architecture in `AppNavigator.jsx`.
- **Lesson 3.2**: `HomeScreen` & component composition (Headers, Banners, Service Grids).
- **Lesson 3.3**: Location search, swapping, and the `VehicleSelectionModal` tier engine.
- **Lesson 3.4**: Animated radar physics in `FindingDriverScreen.jsx`.
- **Lesson 3.5**: Live trip dashboard: Markers, ETAs, and the Safety Center.

### Module 4: Driver App Mechanics
- **Lesson 4.1**: Online/Offline presence toggle and daily telemetry.
- **Lesson 4.2**: The 15-second countdown modal (`RideOfferModal.jsx`) & dispatch timeout patterns.
- **Lesson 4.3**: Navigation stages (`PICKUP` → `EN_ROUTE` → `VERIFY_OTP`) and security gatekeeper.

### Module 5: Commerce & Food Marketplace
- **Lesson 5.1**: Data layer & mock API (`foodApi.js`).
- **Lesson 5.2**: Restaurant feed, cuisine category filters, and live search.
- **Lesson 5.3**: The `FoodCartDrawer.jsx`: Cart steppers, pricing math, discounts, and dispatch handoff.

### Module 6: Backend Infrastructure & Distributed Services
- **Lesson 6.1**: Dockerized microservices stack: MongoDB 7, Redis 7, RabbitMQ 3.12.
- **Lesson 6.2**: In-Memory Geospatial Driver Indexing with Redis GEO (`GEOADD`, `GEOSEARCH`).
- **Lesson 6.3**: Redlock distributed locking for zero-race driver dispatch.
- **Lesson 6.4**: Event-driven decoupling with RabbitMQ Topic Exchanges.
- **Lesson 6.5**: Building the missing Express & WebSocket server (`main.js`).

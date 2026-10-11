# Dropp — Project Overview & Codebase Inventory

## 1. What Dropp Actually Is (Implemented vs. Planned)

**Dropp** is a multi-vertical on-demand mobility, courier delivery, and food commerce platform.
The codebase is structured as a **monorepo with modular frontends and a distributed backend foundation**.

### Implemented Reality Check:
* **Frontend**: Highly implemented with React Native (Expo). Divided into **Rider**, **Driver**, **Food**, and **Shared** modules with custom state-based navigation, Dark/Light theming, simulated dispatch radar animations, turn-by-turn navigation mockup, recipient OTP verification, and shopping carts.
* **Shared Packages**: `@dropp/types` and `@dropp/events` are implemented with frozen enums and standardized UUID domain event envelopes.
* **Backend Infrastructure**: Docker Compose defines MongoDB 7, Redis 7, and RabbitMQ 3.12. Node.js backend connectors exist for MongoDB ([`db.js`](../../apps/backend/src/infrastructure/database/db.js)), Redis GEO & distributed locking ([`redisindex.js`](../../apps/backend/src/infrastructure/redis/redisindex.js)), and RabbitMQ topic exchanges ([`rabbitmq/index.js`](../../apps/backend/src/infrastructure/rabbitmq/index.js)).
* **Missing / In-Progress**:
  - The HTTP/Express server entry file (`apps/backend/src/main.js`) referenced in `apps/backend/package.json` does not exist yet.
  - WebSockets gateway ([`wsServer.js`](../../apps/backend/src/infrastructure/websocket/wsServer.js)) is partially written (syntax cut off mid-declaration).
  - Frontends currently use simulated timers and local Zustand state rather than live REST/WebSocket calls to the backend.

---

## 2. Directory Structure

| Directory | Purpose |
| :--- | :--- |
| `apps/backend/` | Node.js modular backend services, database connectors, Redis GEO engine, and RabbitMQ publishers. |
| `frontend/rider/` | Passenger mobile application (ride booking, package creation, driver finding radar, trip tracking). |
| `frontend/driver/` | Partner driver app (online/offline toggle, 15-second offer countdown modal, turn-by-turn navigation, delivery OTP input). |
| `frontend/food/` | Food delivery marketplace (cuisine filters, promo banners, restaurant menus, drawer cart, checkout). |
| `frontend/shared/` | Central Zustand global store (`useRideStore`), theme system (dark/light), and reusable UI components. |
| `packages/types/` | Shared domain constants (`rideStatus`, `driverStatus`, `userRoles`, `paymentStatus`, `vehicalType`). |
| `packages/events/` | Domain event schema and event creation helpers (`createDomainEvent`, routing key constants). |
| `infrastructure/docker/` | Docker Compose file managing MongoDB, Redis, and RabbitMQ containers. |
| `docs/` | System design documentation and reverse engineering knowledge base. |

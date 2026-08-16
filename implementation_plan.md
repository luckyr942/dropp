# Dropp — Master Phase-Wise Implementation Plan (MongoDB Edition) 🚕🍔📦

> **Target Identity**: Dropp is a production-grade, distributed mobility, delivery, and commerce platform engineered to demonstrate real-world backend architecture, event-driven design, real-time geospatial processing, state-machine integrity, multi-layer concurrency protection, and production observability.

---

## 🏛️ System Architecture Blueprint

```
                              ┌──────────────────────┐
                              │      INTERNET        │
                              └──────────┬───────────┘
                                         │
                              ┌──────────▼───────────┐
                              │     API GATEWAY       │
                              │  Auth / Rate Limit    │
                              └──────────┬───────────┘
                                         │
       ┌─────────────────────────────────┼──────────────────────────────────┐
       │                                 │                                  │
       ▼                                 ▼                                  ▼
┌───────────────┐                 ┌───────────────┐                  ┌───────────────┐
│ RIDER APP     │                 │ DRIVER APP    │                  │ ADMIN DASH    │
│ React Native  │                 │ React Native  │                  │ Next.js 14    │
└───────────────┘                 └───────────────┘                  └───────────────┘

                         ┌────────────────────────────┐
                         │   MODULAR MONOLITH BACKEND │
                         │       NestJS + TS          │
                         └─────────────┬──────────────┘
                                       │
       ┌────────────┬───────────┬──────┼──────┬────────────┬─────────────┐
       ▼            ▼           ▼           ▼             ▼             ▼
     Auth         Users       Drivers      Rides        Orders       Payments
       │            │           │           │             │             │
       │            │           │           ▼             ▼             │
       │            │           │       Matching      Delivery          │
       │            │           │           │             │             │
       │            │           │           ▼             ▼             │
       │            │           │       Location       Restaurant       │
       └────────────┴───────────┴───────────┴─────────────┴─────────────┘
                                       │
                              ┌────────▼────────┐
                              │    RABBITMQ      │
                              │ Topic Exchange  │
                              └────────┬─────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                ▼                      ▼                      ▼
         Notifications            Analytics              Fraud/Risk

       ┌─────────────────────────────────────────────────────────────┐
       │                    INFRASTRUCTURE LAYER                     │
       │ MongoDB 7 (Replica Set) │ Redis 7 GEO & Locks │ RabbitMQ 3.12│
       └─────────────────────────────────────────────────────────────┘
```

---

## 📅 Phase-Wise Implementation Roadmap

### Phase 1: Foundation & Shared Packages 🧱
- [x] Monorepo Setup (`pnpm` workspaces + `Turborepo`).
- [ ] Docker Infrastructure (`docker-compose.yml`: MongoDB 7 Replica Set, Redis 7, RabbitMQ 3.12 with Management UI).
- [ ] Shared Package `@dropp/types`: Enums (`RideStatus`, `DriverStatus`, `PaymentStatus`), DTOs, interfaces.
- [ ] Shared Package `@dropp/events`: Standardized `DomainEvent<T>` metadata envelope & routing keys.
- [ ] Shared Package `@dropp/config`: System constants, environment schemas (`zod`).
- [ ] ADR Setup: `docs/adr/001-modular-monolith.md`, `docs/adr/002-rabbitmq-events.md`.

---

### Phase 2: Core Mobility Engine — Vertical Slice #1 🚕
- [ ] Database Schema: Mongoose / Prisma with MongoDB models (`User`, `Driver`, `Vehicle`, `Ride`, `RideEvent`, `Payment`).
- [ ] Auth & User Module: JWT authentication, refresh token rotation, bcrypt password hashing, Role-Based Access Control (RIDER, DRIVER, ADMIN).
- [ ] Driver Status & Vehicle Module: Onboarding, vehicle verification, online/offline presence toggle.
- [ ] Real-Time Location Engine:
  - WebSocket gateway (`/ws/driver`) receiving high-frequency GPS pings.
  - In-memory geospatial indexing via Redis GEO (`GEOADD drivers:available <lng> <lat> <driver_id>`).
  - Spatial proximity query via Redis `GEOSEARCH` (nearby drivers within radius).
- [ ] Dynamic Pricing Engine:
  - Distance + Duration base fare calculation.
  - Regional supply/demand surge multiplier engine.
- [ ] Ride State Machine:
  - Strict lifecycle transitions: `REQUESTED` → `SEARCHING_DRIVER` → `DRIVER_ASSIGNED` → `DRIVER_ARRIVING` → `DRIVER_ARRIVED` → `RIDE_STARTED` → `RIDE_COMPLETED` → `COMPLETED` / `CANCELLED`.
  - Immutable audit trail recorded in `RideEvent` on every transition.
- [ ] Multi-Layer Concurrency Driver Matching:
  - **Layer 1**: Redis Distributed Lock (`lock:driver:<driver_id>`).
  - **Layer 2**: MongoDB ACID Transaction (`session.startTransaction()`).
  - **Layer 3**: State Constraint verification (`status === AVAILABLE`).

---

### Phase 3: Asynchronous Event Bus & Platform Services ⚡
- [ ] RabbitMQ Producer Service: Publish standard `DomainEvent<T>` payloads to topic exchange `dropp.events`.
- [ ] RabbitMQ Event Namespaces:
  - Ride: `dropp.ride.requested`, `dropp.ride.driver_assigned`, `dropp.ride.started`, `dropp.ride.completed`, `dropp.ride.cancelled`
  - Driver: `dropp.driver.online`, `dropp.driver.offline`, `dropp.driver.location_updated`
- [ ] Notification Service Consumer: Queue listener processing FCM push notifications, SMS alerts, and email dispatches.
- [ ] Idempotent Event Handler Infrastructure: Deduplication cache protecting against duplicate message deliveries.

---

### Phase 4: Financial Engine & Payments 💳
- [ ] Payment Service: State machine (`CREATED` → `PROCESSING` → `SUCCEEDED` / `FAILED`).
- [ ] Idempotency Engine: Request header verification (`Idempotency-Key: <unique_key>`) preventing duplicate charges.
- [ ] Payment Provider Webhook Handler with cryptographic signature verification.
- [ ] Wallet & Settlement System: Driver earnings ledger, withdrawal settlements, refund processing.

---

### Phase 5: Commerce & Logistics Expansion 🍔📦
- [ ] Restaurant Domain: Restaurant profile, categories, food menus, item availability toggle.
- [ ] Order State Machine: (`CREATED` → `CONFIRMED` → `PREPARING` → `READY_FOR_PICKUP` → `PICKED_UP` → `OUT_FOR_DELIVERY` → `DELIVERED`).
- [ ] Logistics Dispatch Engine: Generalized dispatch mechanism reusing Redis GEO proximity matching to assign delivery partners to ready food/package orders.

---

### Phase 6: Operations, Observability & Production Scale 📊
- [ ] Next.js Admin & Operations Dashboard (`apps/admin`):
  - Real-time map displaying online drivers and active ride streams.
  - Operational metrics: Active rides, matching SLA, payment success rate, active WebSockets.
  - Manual ride inspection and incident resolution tools.
- [ ] Observability Pipeline: Prometheus metrics endpoint + Grafana dashboard + OpenTelemetry distributed tracing.
- [ ] Concurrency & Load Testing: `k6` load scripts simulating 1,000+ concurrent riders requesting rides against a pool of 5,000 active drivers.
- [ ] Microservices Extraction Assessment: Benchmark bottleneck components (e.g. Location Service) and extract into independent containerized microservices.
- [ ] CI/CD Pipeline: GitHub Actions workflow running linting, unit tests, integration tests, Docker container builds, and deployment.

---

## 📚 System Design Documentation Parallel Track (`docs/system-design/`)

For every major subsystem built, a corresponding system design spec document will be maintained:
1. `01-architecture-overview.md` — Overall system topography & topology.
2. `02-ride-booking.md` — End-to-end ride booking sequence and payload specs.
3. `03-driver-matching.md` — Redis GEO geospatial lookup & ranking algorithm.
4. `04-location-tracking.md` — WebSocket GPS ingestion & Redis/DB separation strategy.
5. `05-ride-state-machine.md` — State machine transition table and audit log schema.
6. `06-pricing-engine.md` — Fare breakdown formulas & demand/supply surge calculation.
7. `07-payment-system.md` — Idempotent payment pipeline & webhook verification.
8. `08-rabbitmq-architecture.md` — Topic exchange topology, queue routing, and envelope spec.
9. `09-concurrency.md` — Multi-layer concurrency protection against race conditions.
10. `10-scalability.md` — MongoDB sharding, Redis memory optimization, horizontal scaling.
11. `11-failure-handling.md` — Circuit breakers, dead letter queues, fallback strategies.
12. `12-observability.md` — Metrics, logs, traces, and operational alert thresholds.
13. `13-deployment.md` — Docker, Kubernetes, CI/CD pipeline setup.

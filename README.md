# dropp

Here is the full text for `/Users/luckyraj/dropp/README.md`. Select all lines below, copy, and replace everything in your open `README.md` file:

```markdown
# 🚕 Dropp — Distributed Mobility, Delivery & Commerce Platform

> A production-grade, event-driven distributed system for ride-hailing, food delivery, and logistics. Engineered with a domain-isolated Modular Monolith architecture, real-time geospatial driver matching, multi-layer concurrency defense, and asynchronous RabbitMQ event streaming.

---

## 🏛️ System Architecture

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
                         │       Node.js / Express    │
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

## ⚡ Core Engineering Highlights

- **Geospatial Driver Indexing**: High-frequency driver GPS pings are indexed in-memory using `Redis GEO` (`drivers:available`) via WebSockets, completely bypassing heavy disk writes to MongoDB.
- **Multi-Layer Concurrency Defense**: Prevents race conditions during driver matching using a 3-tier safety model:
  1. *Redis Distributed Lock* (`lock:driver:<driver_id>`)
  2. *MongoDB ACID Transaction* (`session.startTransaction()`)
  3. *Driver State Constraint Verification* (`status === AVAILABLE`)
- **Event-Driven Decoupling**: Uses **RabbitMQ** topic exchanges (`dropp.events`) with standardized `DomainEvent` envelopes (`eventId`, `eventType`, `aggregateId`, `occurredAt`, `version`, `payload`).
- **Transactional State Machine**: Enforces strict lifecycle transitions (`REQUESTED` → `SEARCHING_DRIVER` → `DRIVER_ASSIGNED` → `DRIVER_ARRIVED` → `RIDE_STARTED` → `RIDE_COMPLETED` → `COMPLETED` / `CANCELLED`) with full audit logging.
- **Domain-Isolated Modular Monolith**: Strictly enforces domain ownership boundaries, enabling effortless extraction into microservices when scaling demands it.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend Core** | Node.js (ES Modules), Express.js, WebSockets (`ws`) |
| **Databases & Caches** | MongoDB 7 (Replica Set), Redis 7 (Redis GEO, Redlock) |
| **Messaging & Queues** | RabbitMQ 3.12 (AMQP Topic Exchange) |
| **Shared Workspace** | pnpm Workspaces, Turborepo |
| **Infrastructure** | Docker, Docker Compose |

---

## 📁 Repository Structure

```
dropp/
├── apps/
│   ├── backend/               # Core Express & WebSocket Monolith Backend
│   ├── admin/                 # Next.js Operations & Live Tracking Dashboard
│   ├── rider/                 # React Native / Expo Rider Client
│   └── driver/                # React Native / Expo Driver Client
├── packages/
│   ├── types/                 # Shared Domain Enums & Constants
│   └── events/                # Standardized DomainEvent Envelope & Routing Keys
├── infrastructure/
│   └── docker/                # Docker Compose (MongoDB, Redis, RabbitMQ)
├── docs/
│   ├── system-design/         # Deep-dive System Design Architecture Specs
│   └── adr/                   # Architecture Decision Records
├── pnpm-workspace.yaml        # Workspace configuration
└── turbo.json                 # Turborepo pipeline configuration
```

---

## 🚀 Quickstart Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) v9+
- [Docker & Docker Compose](https://www.docker.com/)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/dropp.git
cd dropp
pnpm install
```

### 2. Launch Infrastructure Services
Spin up MongoDB 7, Redis 7, and RabbitMQ 3.12:
```bash
npm run docker:up
```

* **RabbitMQ Management Dashboard**: `http://localhost:15672` (`dropp_admin` / `dropp_password`)
* **MongoDB Instance**: `mongodb://localhost:27017/dropp_db`
* **Redis Cache**: `redis://localhost:6379`

### 3. Start Backend Development Server
```bash
cd apps/backend
npm run dev
```

The backend server will run at **`http://localhost:4000`**. You can verify health via:
```bash
curl http://localhost:4000/health
```

---

## 📖 Architecture Decision Records (ADRs)

- [ADR 001: Selection of Modular Monolith Architecture with MongoDB](docs/adr/001-modular-monolith.md)
```

---

Save `README.md`, and reply with **"README Done"** so we can build the backend server files in **Step 3 (`apps/backend`)**!
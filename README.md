# NextBit Engineering

> A hybrid B2B2C trust infrastructure and retail marketplace operating system built for the East African laptop and PC market. NextBit combines hardware verification, distributed escrow payments, a WebSocket-backed technician marketplace, and AI-powered semantic assistance into a single unified platform.

**Production Deployment:** [https://nextbit-computers.vercel.app](https://nextbit-computers.vercel.app)  
**Source Code Repository:** [https://github.com/AquilaWilfred/nextbit_computers](https://github.com/AquilaWilfred/nextbit_computers)

---

## 📋 Project Submission — BIT3208 Advanced Web Design and Development

| Deliverable Artifact | Description / Scope | Resource Link |
| :--- | :--- | :--- |
| **Project Documentation** | Comprehensive architecture report, system design schemas, and evaluation. | [View Document](./docs/BSCCS202231309_ADVANCED%20WEB%20DESIGN%20%20BIT3208%20PROJECT%20DOCUMENTATION.pdf) |
| **Logbook Report** | Verified weekly engineering log tracking project lifecycle milestones. | [View Logbook](./docs/Logbook_Report.pdf) |
| **Live Deployment** | Publicly accessible production instance executing on Vercel edge networks. | [nextbit-computers.vercel.app](https://nextbit-computers.vercel.app) |

---

## 🏗 System Architecture

NextBit runs as three decoupled, independent services communicating over highly secure asynchronous HTTPS/WSS channels:


  Browser / Client Application
               │
               ▼
   Next.js Frontend (Vercel)
               │
     ┌─────────┴─────────┐
     ▼                   ▼
Rust/Axum Gateway   FastAPI Catalogue
(Render)            (Render)
Auth / Payments     Products / AI
Escrow / Orders     ML Inference
     │                   │
     └─────────┬─────────┘
               ▼
  PostgreSQL  ·  Redis  ·  MongoDB
  (Neon)     (Upstash)   (Atlas)


---

## 🛠 Technology Stack Matrix

| Architectural Layer | Technology Selection | Infrastructure Provider | Purpose & Implementation |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | Next.js / TypeScript / Tailwind CSS | Vercel Edge | Core client app layer, state management, and view renders. |
| **Gateway API** | Rust / Axum | Render | Core ingestion router, auth validation, and fintech state engine. |
| **Catalogue & AI** | Python / FastAPI | Render | High-performance product querying and LLM semantic inference. |
| **Primary Database** | PostgreSQL | Neon Serverless | System-wide relational data storage and transactional tables. |
| **Caching Layer** | Redis | Upstash | High-speed active session caching and transient socket state. |
| **Document Store** | MongoDB | Atlas | Flexible schema engine for complex hardware data attributes. |
| **Mobile Payments** | M-Pesa Daraja API | Safaricom | Direct local consumer STK push liquidity acquisition. |
| **Card Payments** | Flutterwave v4 | Sandbox | Cross-border merchant settlement and bank payout rails. |
| **Object Storage** | Cloudflare R2 | S3 API Compliant | Encrypted vendor compliance documents, KRA PIN, and CR12s. |

---

## 🌐 Live Service Endpoints & Interactive Schemas

| Target Component | Resource Endpoint | Purpose / Access |
| :--- | :--- | :--- |
| **Production Web UI** | [https://nextbit-computers.vercel.app](https://nextbit-computers.vercel.app) | User-facing marketplace interface. |
| **Axum Routing Gateway** | [https://nextbit-gateway.onrender.com](https://nextbit-gateway.onrender.com) | Core backend system root proxy. |
| **FastAPI Core Catalogue** | [https://nextbit-catalogue.onrender.com](https://nextbit-catalogue.onrender.com) | Product data subsystem proxy root. |
| **Catalogue API Docs** | [https://nextbit-catalogue.onrender.com/docs](https://nextbit-catalogue.onrender.com/docs) | Interactive Swagger UI for Python endpoints. |
| **Gateway Swagger UI** | [https://nextbit-gateway.onrender.com/swagger-ui/](https://nextbit-gateway.onrender.com/swagger-ui/) | OpenAPI schema docs for Rust/Axum engine. |

---

## ✨ Core Platform Features

### 💳 Escrow Payment Infrastructure

> Secure peer-to-peer settlements using M-Pesa Daraja STK Push. When a buyer completes checkout, funds are securely captured and held in an isolated escrow state transition machine inside the Axum gateway (state: `Held`).
>
> Upon physical delivery confirmation or administrative audit sign-off, the gateway orchestrates a programmatic disbursal to the merchant via Flutterwave API rails. This system aggressively mitigates regional retail fraud factors.

### 🪪 Virtual Visa Wallet (NextBit Wallet)

> Offers on-demand issuance of transactional virtual payment profiles. Features a hardware-accelerated 3D animated flip-card user interface for viewing card data, live balance tracking, transaction ledger queries, and real-time loyalty rewards calculations.

### 🏢 B2B Corporate Portal

> A secure B2B procurement environment handling high-volume business orders. Integrates automated compliance checking workflows requiring authenticated business KRA PIN verification and CR12 corporate document uploads, utilizing an administrative multi-sig document validation pipeline.

### 🔧 Technician Marketplace

> An on-demand repair routing network matching hardware issues with local engineers. Client-submitted repair pipelines distribute requests instantly to verified nearby mechanics via full-duplex WebSocket connections, allowing live multi-tier job state updates and immutable history ledger scores.

### ♻️ Trade-In & E-Waste System

> An algorithmic consumer asset valuation module. Scans inbound device profiles against standard technical wear vectors and dynamic inventory valuation tables to generate instant exchange pricing, routing end-of-life hardware safely into circular economy processing streams.

### 💻 NextBit Probe — Hardware Diagnostic Tool

> A low-level native cross-platform diagnostic binary framework written in Rust. Executes deep local inspection of hardware modules, parsing live CPU thermals, SMART disk block wear states, battery cycle metrics, and local firmware configurations. Generates portable offline visual HTML auditing documents. Distributed publicly via [nextbit-probe-site.vercel.app](https://nextbit-probe-site.vercel.app).

### 🤖 AI Assistant

> A catalog-aware conversational customer support agent built on top of the Claude API. Fully handles intelligent semantic indexing of system inventory databases, automated ticket triaging, and real-time inventory translation lookups.

### ⚖️ Conflict Resolution System

> A structured dispute-arbitration system designed to settle transactional frictions. Tracks evidence trails, logs message history indices, and presents clear administration control views with detailed system log verification paths to trace actions.

---

## 🗂 Escrow System — Developer File Map

| System Module File | Target Repository Path | Purpose within Gateway |
| :--- | :--- | :--- |
| `20260501000001_escrow.sql` | `gateway-app/migrations/` | Relational schema adjustments for escrow tracking. |
| `escrow_models.rs` | `gateway-app/src/models/` | Rust struct declarations mapping ledger databases. |
| `escrow_service.rs` | `gateway-app/src/services/` | Central domain logic executing state updates. |
| `flutterwave_service.rs` | `gateway-app/src/services/` | Direct out-of-band banking disbursement connector. |
| `escrow_handlers.rs` | `gateway-app/src/handlers/` | Ingestion controllers decoding incoming webhooks. |
| `escrow_routes.rs` | `gateway-app/src/routes/` | URI endpoints mounted on the core web router. |
| `cargo_additions.toml` | `gateway-app/Cargo.toml` | External compilation requirements and crates. |

### Module Wiring Configuration (`main.rs`)

rust
mod models   { pub mod escrow; }
mod services { pub mod escrow; pub mod flutterwave; }
mod handlers { pub mod escrow; }
mod routes   { pub mod escrow; }

// Mounting routes within the core runtime builder:
use routes::escrow::escrow_routes;

let app = Router::new()
    .merge(escrow_routes())
    .with_state(app_state);


### Application State Dependency Structs

rust
pub struct AppState {
    pub db:          PgPool,            // Thread-safe connection pool to PostgreSQL
    pub http_client: reqwest::Client,   // Reusable client pooling connections for out-of-band APIs
    pub config:      Config,            // Structured immutable environmental mappings
}

pub struct Config {
    pub flutterwave_secret: String,     // Target credential parsing system token
}


### Executing Target Migrations

bash
sqlx migrate run --database-url $DATABASE_URL


---

## 🔐 Environment Configuration Guidelines

> **Security Warning:** Never expose production keys within public repository configurations. Use local files for sandboxed testing and bind actual credentials strictly inside runtime platform deployment dashboards.

### Frontend Client Layer — `frontend/.env.local`

dotenv
# API Routing Mappings
NEXT_PUBLIC_API_URL=https://nextbit-catalogue.onrender.com
NEXT_PUBLIC_GATEWAY_URL=https://nextbit-gateway.onrender.com
NEXT_PUBLIC_CATALOGUE_URL=https://nextbit-catalogue.onrender.com

# Asynchronous Real-Time Sockets Configuration
NEXT_PUBLIC_WS_URL=wss://nextbit-gateway.onrender.com
NEXT_PUBLIC_WS_PORT=443

# Server-Side Internal Routing Target Handles
CATALOGUE_URL=https://nextbit-catalogue.onrender.com
AXUM_GATEWAY_URL=https://nextbit-gateway.onrender.com
PLATFORM_SELLER_ID=your-seller-uuid

# Core Infrastructure Persistence Backends (Local Mock Tokens)
DATABASE_URL=your-neon-postgres-url
REDIS_URL=your-upstash-redis-url
MONGO_URL=your-mongodb-atlas-url

# Cryptographic Identity & Session Context
NEXTAUTH_URL=https://nextbit-computers.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret


### Gateway Router Layer — `gateway-app/.env`

dotenv
# Port Allocation & Execution Trace Levels
GATEWAY_PORT=8080
RUST_LOG=info,gateway=debug,tower_http=info

# Internal Service Handlers Connectors
DATABASE_URL=your-neon-postgres-url
REDIS_URL=your-upstash-redis-url

# Third-Party Settlement Keys (Flutterwave Sandbox Profiles)
FLW_CLIENT_ID=your-flutterwave-client-id
FLW_CLIENT_SECRET=your-flutterwave-client-secret
FLW_ENCRYPTION_KEY=your-encryption-key
FLW_WEBHOOK_SECRET=your-webhook-secret
FLW_TOKEN_URL=https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token
FLW_API_BASE=https://developersandbox-api.flutterwave.com


### Catalogue Layer — `catalogue/.env`

dotenv
# Execution Mapping Ports
CATALOGUE_PORT=8001

# System Engine Connections
DATABASE_URL=your-neon-postgres-url
MONGO_URL=your-mongodb-atlas-url


---

## 🚀 Local Development Environment Execution

Execute these command blocks inside your target terminal environment to initialize local development proxies:

### 1. System Replication

bash
git clone https://github.com/AquilaWilfred/nextbit_computers
cd nextbit_computers


### 2. Boot Core Routing Gateway (Rust/Axum) — Port `:8080`

bash
cd gateway-app
cargo run


### 3. Initialize Intelligent Catalogue (FastAPI) — Port `:8001`

bash
cd ../catalogue
pip install -r requirements.txt
uvicorn main:app --reload --port 8001


### 4. Mount Client Application Layout (Next.js) — Port `:3000`

bash
cd ../frontend
npm install
npm run dev


Your browser tracking dashboard is now accessible at: [http://localhost:3000](http://localhost:3000)

---

## 👤 Engineering Project Author

**Amon Aquila Wilfred**  
*Lead Platform Architect & Systems Engineer (AquilaX)*

- **Professional Profile:** Founder — XcognVis.Com, Nairobi, Kenya
- **Academic Placement:** BSc. Computer Science — Mount Kenya University
- **Student Registration Number:** BSCCS/2022/31309


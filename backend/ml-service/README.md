# NextBit ML Service

The AI/ML brain of the NextBit Retail Operating System.  
Built with FastAPI (Python 3.12) and designed to work alongside the Axum gateway.

---

## What This Service Does

This service handles everything that requires machine learning or statistical analysis
in the NextBit ecosystem. The Axum gateway handles all client-facing API requests,
business logic, and database operations. This service is called internally by Axum
whenever intelligence is needed.
Client → Axum Gateway (Rust) → NextBit ML Service (Python)
↓
PostgreSQL / MongoDB / Redis

---

## Responsibilities

### Market Forecasting (`/api/v1/market`)
Predicts product demand based on historical sales data, seasonality, and market trends.
Helps the retail operator know what to stock before customers ask for it.

### Hardware Anomaly Detection (`/api/v1/hardware`)
Analyzes hardware probe reports collected by the probe agent and flags devices that
show signs of failure before they actually fail. Uses isolation forest and time-series
analysis on CPU temperatures, disk health, memory errors, and network anomalies.

### Pricing Intelligence (`/api/v1/pricing`)
Suggests optimal selling prices based on cost price, competitor pricing, demand
forecasts, and margin targets. Helps the operator stay competitive without manually
tracking every product.

### Inventory Optimization (`/api/v1/inventory`)
Calculates reorder points, optimal stock levels, and supplier lead times. Tells the
operator exactly when to reorder and how much to order to avoid stockouts or overstock.

---

## Project Structure
ml-service/
├── app/
│   ├── api/
│   │   └── v1/                 # All route handlers, versioned from day one
│   │       ├── health.py       # Service health check
│   │       ├── market.py       # Market forecasting routes
│   │       ├── hardware.py     # Hardware anomaly routes
│   │       ├── pricing.py      # Pricing intelligence routes
│   │       └── inventory.py    # Inventory optimization routes
│   │
│   ├── core/                   # App-wide concerns
│   │   ├── config.py           # All settings loaded from .env
│   │   ├── security.py         # API key verification, token validation
│   │   └── logging.py          # Structured logging configuration
│   │
│   ├── db/                     # Database connection layer
│   │   ├── postgres.py         # SQLAlchemy async engine (reads sales history)
│   │   ├── mongo.py            # Motor async client (reads probe snapshots)
│   │   └── redis.py            # Redis client (caches predictions)
│   │
│   ├── middleware/             # Runs on every request
│   │   ├── auth.py             # Verifies requests come from Axum
│   │   ├── logging.py          # Logs every request with timing
│   │   └── rate_limit.py       # Prevents runaway ML calls
│   │
│   ├── models/                 # Pure ML code — no FastAPI, no DB
│   │   ├── forecast.py         # Demand forecasting (scikit-learn)
│   │   ├── anomaly.py          # Anomaly detection (isolation forest)
│   │   ├── pricing.py          # Pricing engine (regression model)
│   │   └── inventory.py        # Stock optimizer (EOQ model)
│   │
│   ├── schemas/                # Pydantic request/response shapes
│   │   ├── market.py           # ForecastRequest, ForecastResponse
│   │   ├── hardware.py         # AnomalyRequest, AnomalyResponse
│   │   ├── pricing.py          # PricingRequest, PricingResponse
│   │   └── inventory.py        # InventoryRequest, InventoryResponse
│   │
│   ├── services/               # Business logic — routes call services
│   │   ├── market.py           # Fetches data, calls forecast model
│   │   ├── hardware.py         # Fetches probe data, calls anomaly model
│   │   ├── pricing.py          # Fetches costs, calls pricing model
│   │   └── inventory.py        # Fetches stock data, calls optimizer
│   │
│   ├── dependencies/           # FastAPI dependency injection
│   │   ├── auth.py             # get_current_service() — who is calling?
│   │   └── db.py               # get_db(), get_mongo(), get_redis()
│   │
│   ├── utils/                  # Pure helper functions, no side effects
│   │   ├── math.py             # Statistical helpers (moving average, etc.)
│   │   ├── dates.py            # Date range helpers, season detection
│   │   └── formatting.py       # Response formatters, rounding helpers
│   │
│   ├── hooks/                  # Application lifecycle
│   │   ├── startup.py          # Load ML models into memory, open DB connections
│   │   └── shutdown.py         # Close connections, flush caches cleanly
│   │
│   └── main.py                 # FastAPI app definition and router registration
│
├── tests/
│   ├── conftest.py             # Shared pytest fixtures (test DB, mock clients)
│   ├── unit/                   # Test individual functions in isolation
│   │   ├── test_forecast.py    # Test forecast model math
│   │   ├── test_pricing.py     # Test pricing calculations
│   │   └── test_inventory.py   # Test EOQ calculations
│   └── integration/            # Test full HTTP request/response cycles
│       ├── test_market_api.py  # POST /api/v1/market/forecast
│       ├── test_hardware_api.py# POST /api/v1/hardware/analyze
│       └── test_health.py      # GET /health
│
├── docs/
│   ├── architecture.md         # How this service fits in NextBit
│   ├── models.md               # ML model documentation and accuracy metrics
│   └── api.md                  # API usage examples for Axum integration
│
├── scripts/
│   ├── seed_data.py            # Populate test data for development
│   └── train_models.py         # Train or retrain ML models on new data
│
├── .env                        # Your actual environment variables (never commit)
├── .env.example                # Template showing required variables
├── requirements.txt            # Production dependencies
├── requirements-dev.txt        # Development and test dependencies
├── pytest.ini                  # Test configuration
├── server.py                   # Uvicorn entry point (runs the app)
└── README.md                   # This file

---

## Layer Rules (Important)

These rules keep the codebase clean as it grows:
Route → Service → Model
Route → Service → DB

- **Routes** only validate input and call services. No database calls, no ML calls.
- **Services** orchestrate — they fetch data from DB, call ML models, return results.
- **Models** are pure math. No database, no FastAPI, no HTTP. Just input → output.
- **DB layer** only manages connections and raw queries. No business logic.
- **Utils** are pure functions. No database, no HTTP, no side effects.

If you find yourself calling the database from a route, stop and move it to a service.
If you find yourself doing ML math in a service, stop and move it to a model.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
APP_NAME=NextBit ML Service
APP_VERSION=0.1.0
DEBUG=true
PORT=8000
Shared databases (same as Axum gateway)
DATABASE_URL=postgresql+asyncpg://...
MONGO_URL=mongodb+srv://...
REDIS_URL=rediss://...
Internal service communication
GATEWAY_URL=http://localhost:8080
INTERNAL_API_KEY=your_shared_secret_key_with_axum

---

## Running the Service

**Development:**
```bash
pip install -r requirements.txt -r requirements-dev.txt --break-system-packages
python3 server.py
```

**Or with uvicorn directly:**
```bash
uvicorn app.main:app --reload --port 8000
```

**API docs (auto-generated by FastAPI):**
http://localhost:8000/docs      ← Swagger UI
http://localhost:8000/redoc     ← ReDoc

---

## Running Tests

```bash
pytest tests/unit/          # fast, no network needed
pytest tests/integration/   # requires running service
pytest --cov=app tests/     # with coverage report
```

---

## How Axum Calls This Service

In the Axum gateway, calls to this service look like:

```rust
let response = reqwest::Client::new()
    .post("http://localhost:8000/api/v1/market/forecast")
    .header("X-Internal-Key", &config.internal_api_key)
    .json(&payload)
    .send()
    .await?;
```

The `X-Internal-Key` header is verified by the auth middleware on every request.
This ensures only the Axum gateway can call this service — not external clients.

---

## Adding a New ML Feature

1. Add Pydantic schemas to `schemas/`
2. Write the ML logic in `models/`
3. Write the service in `services/` (fetches data, calls model)
4. Add the route in `api/v1/`
5. Register the router in `main.py`
6. Write unit tests in `tests/unit/`
7. Write integration tests in `tests/integration/`
8. Document in `docs/models.md`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web framework | FastAPI 0.115 |
| Runtime | Python 3.12 |
| Server | Uvicorn |
| Validation | Pydantic v2 |
| ML | scikit-learn, numpy, pandas |
| PostgreSQL | SQLAlchemy async + asyncpg |
| MongoDB | Motor (async) |
| Redis | redis-py |
| Tests | pytest + httpx |

---

## Relationship to Other NextBit Services

| Service | Language | Role |
|---|---|---|
| gateway | Rust / Axum | Client-facing API, auth, RBAC, DB writes |
| ml-service | Python / FastAPI | Internal AI/ML predictions (this service) |
| probe | Rust / eBPF | Hardware monitoring agent |
| catalogue | TBD | Product and inventory data |

---

*Built by Eagle — XcognVis.Com*  
*"I don't just write code, I craft it."*

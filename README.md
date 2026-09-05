# GrowwLens

## A watchlist that thinks like a trader

GrowwLens is a full-stack market-intelligence terminal built for traders who
need more than a list of prices. It answers four practical questions:

1. **What changed?**
2. **Why did it change?**
3. **How important is the change?**
4. **What deserves attention next?**

The application combines live market data from the **Groww API** and the
**Indian Stock Market API** with simulated events, persistent watchlists,
technical analysis, anomaly detection, alerts, notifications, news timelines,
related stocks, charts, heatmaps, and simulated orders in one trader-focused
workflow.

Groww provides quote, LTP, OHLC, profile, holdings, and margin data, while the
Indian Stock Market API enriches the terminal with market activity, news,
trending data, and sector-peer context. When external credentials or live
quotes are unavailable, GrowwLens continues with seeded snapshots and its
built-in simulator for reliable demonstrations.

> **GrowwLens is not a broker or an investment-advice system.** It is an
> event-driven market-observation and paper-trading prototype.

## What has been built

### Trader experience

- Multiple persistent watchlists with create, delete, add, remove, and pin actions.
- Default watchlist loading with enriched stock rows and live row updates.
- A **What changed?** view based on each item’s persisted last-seen baseline.
- Price, daily percentage, volume, volume ratio, anomaly status, EMA20, pressure,
  sparklines, 52-week range, holdings, and change-since-added fields.
- Live market-status and data-quality indicators.
- Stock terminal with interactive lightweight charts.
- Volume/order-book visualization and market heatmaps.
- News-to-market reaction timelines.
- Related-stock and sector-peer discovery.
- Simulated BUY/SELL orders with persisted order and holding records.
- Cross-device mutation fanout for connected browser sessions.

### Market intelligence

Every market update is represented as a canonical `MarketEvent`. The change
engine then calculates:

- EMA20 and EMA50 values.
- Bullish and bearish EMA crossovers.
- Volume ratio against a proportional baseline.
- Volume-anomaly detection.
- Signed-volume buy and sell pressure.
- Rolling volatility.
- A deterministic 0–100 attention score.
- Human-readable meaningful-change explanations.

The simulator is intentionally useful for demonstrations and off-hours testing:
it changes prices, volumes, indicators, indices, alerts, and notifications
without requiring an external market feed.

### Alerts and notifications

- Stateful price alerts with `ARMED`, `TRIGGERED`, `COOLDOWN`, and `DISABLED`
  states.
- PostgreSQL row locks protect the alert transition.
- A unique `(alert_id, market_event_id)` constraint prevents duplicate logical
  alerts.
- Immediate in-app notifications over WebSocket.
- Toast notifications in the frontend.
- Email audit records and optional Resend delivery.
- A concurrency demonstration showing duplicate-alert suppression.

## Architecture

```text
React 19 + TypeScript + Vite
             │
             │ REST + WebSocket
             ▼
FastAPI application
             │
   ┌─────────┼────────────────────┐
   ▼         ▼                    ▼
PostgreSQL Redis Streams     Provider adapter
source of   groww:market-   simulator / Groww
truth       events          / IndianStockAPI
   │         │                    │
   └─────────┴──────────────┬─────┘
                            ▼
                 Change + alert engines
                            │
                            ▼
                    WebSocket gateway
                            │
                            ▼
                 Browser tables and alerts
```

### Event lifecycle

1. The provider adapter creates a `MarketEvent`.
2. The event is published to the `groww:market-events` Redis Stream.
3. The stream consumer processes the event.
4. The change engine calculates indicators, attention, and meaningful changes.
5. The alert engine evaluates active alerts inside a transactional lock.
6. The database records snapshots, alert events, and notifications.
7. The WebSocket gateway broadcasts ticks, changes, and alert events.
8. The frontend updates existing rows by `symbol` without depending on WebSocket
   data for initial REST table population.

### Consistency model

PostgreSQL is the preferred source of truth. Alert processing uses native row
locking:

```sql
SELECT status FROM alerts
WHERE id = $1
FOR UPDATE;
```

The database also enforces an idempotency constraint:

```text
UNIQUE(alert_id, market_event_id)
```

SQLite/WAL and an asyncio queue remain explicit local fallback modes for tests
and offline development; they are not silently presented as distributed
production infrastructure.

## Technology stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Lightweight Charts
- Lucide React
- Oxlint

### Backend

- Python 3.12+
- FastAPI
- Pydantic
- Uvicorn
- Psycopg 3
- Redis Python client
- HTTPX
- Groww Python SDK

### Infrastructure

- PostgreSQL 16
- Redis 7 and Redis Streams
- Docker Compose
- SQLite/WAL fallback
- Render-compatible FastAPI deployment
- Vercel-compatible Vite deployment

## Repository layout

```text
Groww/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── router.py              # REST endpoints
│   │   │   └── websocket.py           # WebSocket gateway
│   │   ├── core/
│   │   │   ├── config.py              # Environment configuration
│   │   │   ├── events.py              # Canonical event models
│   │   │   └── market_stream.py       # Redis Streams / queue fallback
│   │   ├── db/
│   │   │   ├── database.py             # PostgreSQL/SQLite adapter
│   │   │   └── schema.sql              # Relational schema
│   │   ├── services/
│   │   │   ├── provider_adapter.py     # Live/simulated market source
│   │   │   ├── change_detector.py      # Indicators and attention
│   │   │   ├── alert_engine.py         # Locked alert state machine
│   │   │   ├── notification_service.py # Device/email delivery
│   │   │   ├── groww_service.py        # Groww integration
│   │   │   ├── indian_stock_service.py # Optional market/news provider
│   │   │   ├── news_timeline.py        # News reaction timelines
│   │   │   └── similarity_engine.py     # Related stocks and peers
│   │   └── main.py
│   └── tests/
├── frontend/
│   └── src/
├── docs/
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

## Run locally

### Prerequisites

- Python 3.12+
- Node.js 18+
- Docker Desktop and Docker Compose

### 1. Start PostgreSQL and Redis

```bash
docker compose up -d
docker compose ps
```

| Service | Image | Host port |
| --- | --- | --- |
| PostgreSQL | `postgres:16-alpine` | `55432` |
| Redis | `redis:7-alpine` | `6379` |

Port `55432` is intentional so a native PostgreSQL installation on `5432`
does not conflict with the project.

### 2. Configure the backend

```bash
cp .env.example .env
```

Local defaults:

```env
DATABASE_URL=postgresql://groww:groww@localhost:55432/groww_lens
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=true
CORS_ORIGINS=http://localhost:5173
```

The backend creates the schema and seeds demo watchlists on startup.

### 3. Install and start FastAPI

```bash
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
./venv/bin/uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --app-dir backend
```

Backend: <http://localhost:8000>

### 4. Install and start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: <http://localhost:5173>

## Deployment

### Render backend

Create a Render Web Service with:

```text
Build command: pip install -r requirements.txt
Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend
```

Set:

```env
DATABASE_URL=<Render PostgreSQL internal URL>
REDIS_URL=<Render Redis URL>
REDIS_ENABLED=true
CORS_ORIGINS=https://<your-vercel-domain>
```

Never commit database passwords, Redis URLs, API keys, or `.env` files.

### Vercel frontend

Set the Vercel project root directory to `frontend`, then configure:

```env
VITE_API_URL=https://<your-render-service>.onrender.com
VITE_WS_URL=wss://<your-render-service>.onrender.com
```

Build settings:

```text
Install command: npm install
Build command: npm run build
Output directory: dist
```

`VITE_*` values are embedded at build time, so changing them requires a new
Vercel deployment. The Render CORS origin must exactly match the browser origin,
including hyphens and without a trailing slash.

## Configuration and integrations

The simulator and seeded data work without external credentials. Optional
integrations are enabled through environment variables:

| Variable | Used for |
| --- | --- |
| `GROWW_API_KEY` | Groww SDK authentication |
| `GROWW_API_SECRET` | Groww SDK authentication |
| `INDIAN_STOCK_API_KEY` | News, trending data, and sector peers |
| `RESEND_API_KEY` | Real email delivery |
| `RESEND_FROM_EMAIL` | Resend sender address |
| `FINNHUB_API_KEY` | Reserved provider integration |
| `TWELVEDATA_API_KEY` | Reserved provider integration |

Groww-backed endpoints include quote, LTP, OHLC, profile, holdings, and margin
access. Provider failures do not require fake credentials: the application can
continue in simulator or seeded-snapshot mode.

## REST API map

All endpoints use the `/api` prefix.

| Area | Endpoints |
| --- | --- |
| Health/market | `/system/health`, `/indices`, `/heatmap`, `/heatmap/data` |
| Simulation | `/settings/simulation-mode`, `/simulator/anomaly` |
| Watchlists | `/watchlists`, `/watchlists/{id}/items`, `/watchlists/{id}/items/{symbol}/pin` |
| Change detection | `/what-changed`, `/mark-seen` |
| Stock intelligence | `/stocks/{symbol}`, `/history`, `/volume-orderbook`, `/timeline`, `/related`, `/peers` |
| News | `/news/feed` |
| Groww | `/groww/quote`, `/ltp`, `/ohlc`, `/profile`, `/holdings`, `/margin` |
| Alerts | `/alerts`, `/alerts/simulate-race` |
| Notifications | `/notifications`, `/notifications/mark-read`, `/emails`, `/devices` |
| Paper trading | `/orders` |

`GET /api/watchlists` returns a top-level array of watchlists. Each watchlist
contains `id`, `name`, `is_default`, `items_count`, and an `items` array of
enriched stock objects.

## WebSocket contract

Local connection:

```text
ws://localhost:8000/ws?user_id=demo_user&device_id=dev_browser&device_name=Browser&device_type=desktop
```

Production connection:

```text
wss://<your-render-service>.onrender.com/ws
```

Server events:

- `CONNECTED`
- `TICK`
- `WHAT_CHANGED`
- `ALERT_TRIGGERED`
- `CROSS_DEVICE_MUTATION`
- `PONG`

Client messages:

```json
{"action":"PING"}
```

```json
{
  "action": "SYNC_MUTATION",
  "data": {
    "mutationType": "WATCHLIST_UPDATED",
    "payload": {}
  }
}
```

REST loads the initial stock table. WebSocket messages then update matching
symbols, stream meaningful changes, and deliver notifications. The table does
not depend on market ticks to show the persisted watchlist.

## Database model

The schema is defined in
[`backend/app/db/schema.sql`](backend/app/db/schema.sql). It includes:

- `users` and `devices`
- `watchlists` and `watchlist_items`
- `alerts` and `alert_events`
- `market_snapshots` and `technical_signals`
- `news_items`
- `notifications` and `notification_jobs`
- `orders` and `portfolio_holdings`

PostgreSQL is the preferred runtime. SQLite remains available for offline
development and test execution.

## Validation commands

```bash
# Backend tests
./venv/bin/pytest backend/tests/test_backend.py

# Backend syntax
./venv/bin/python -m compileall -q backend/app

# Frontend production build
cd frontend
npm run build

# Frontend lint
npm run lint
```

## Honest scope and current limitations

This project deliberately distinguishes implemented demo capabilities from
production-hardening work:

- Authentication is currently represented by a fixed demo user; multi-user
  authorization is not implemented.
- The simulator is the reliable default source without provider credentials.
- Email dispatch currently runs as an asynchronous task in the API process; a
  separate worker/queue service is a future production step.
- News timelines and some correlations use deterministic demo data.
- Orders are simulated and persisted; no real broker order is placed.
- A true provider-independent exchange stream, observability stack, rate-limit
  policy, and production secrets management remain future work.

## Project documentation

- [`docs/project-status.md`](docs/project-status.md) — implementation audit,
  original plan versus delivered scope, APIs, data model, and roadmap.
- [`docs/architecture.md`](docs/architecture.md) — architecture details.
- [`docs/failure-scenarios.md`](docs/failure-scenarios.md) — failure and
  consistency scenarios.
- [`docs/implementation_plan.md`](docs/implementation_plan.md) — planned
  implementation phases.

## License

GrowwLens is a technical demonstration built for the Groww challenge.

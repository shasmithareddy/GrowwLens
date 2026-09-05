# GrowwLens

## Intelligent Event-Driven Market Watchlist

GrowwLens is a trader-focused market intelligence platform that goes beyond
showing the current price. It tells a trader **what changed, why it changed,
how significant it is, and where attention may be needed next**.

The product combines live/simulated market updates, volume anomaly detection,
EMA crossovers, buy/sell pressure, deterministic attention scores, price alerts,
notifications, news-to-market timelines, related stocks, charts, heatmaps, and
simulated buy/sell orders.

> A watchlist with a trader's perspective: understand the market before reacting
> to it.

## Highlights

- Multiple persistent watchlists with pinning and differential state.
- “What changed since you last checked?” based on last-seen price, volume, and
  attention baselines.
- Event-driven market updates over Redis Streams.
- PostgreSQL persistence with native row-level locking.
- SQLite/WAL fallback for offline development and tests.
- EMA20/EMA50 crossover detection.
- Volume-ratio and anomaly detection.
- Signed-volume buy/sell pressure analysis.
- Deterministic 0–100 attention scoring.
- Stateful, idempotent alerts with cooldowns.
- WebSocket updates and cross-device mutation fanout.
- In-app notifications and optional Resend email delivery.
- Groww quote/LTP/OHLC/profile/holdings/margin integration.
- Optional IndianStockAPI news and peer discovery.
- Trading terminal with Lightweight Charts.
- News reaction timelines, related stocks, and sector heatmaps.
- Simulated order execution with holdings persistence.
- Race-condition demonstration for duplicate alert prevention.

## Architecture

```text
React + Vite + TypeScript
          │ REST / WebSocket
          ▼
FastAPI application
          │
          ├── PostgreSQL (source of truth)
          │       └── SELECT ... FOR UPDATE
          │
          ├── Redis Streams (durable market event transport)
          │       └── local asyncio queue fallback
          │
          ├── Market Provider Adapter
          │       ├── simulator
          │       └── optional Groww synchronization
          │
          ├── Meaningful Change Engine
          ├── Stateful Alert Engine
          ├── Notification Service
          └── WebSocket Gateway
```

### Event flow

1. The provider adapter creates a canonical `MarketEvent`.
2. The event is published to the `groww:market-events` Redis Stream.
3. The stream consumer processes the event exactly through the application flow.
4. The change engine calculates technical signals and attention.
5. The alert engine evaluates active alerts under a database lock.
6. The WebSocket gateway broadcasts ticks and alert events to connected devices.
7. The notification service records in-app notifications and dispatches email
   asynchronously when configured.

### Alert consistency

PostgreSQL uses native row locking:

```sql
SELECT status FROM alerts WHERE id = $1 FOR UPDATE;
```

The database also enforces:

```text
UNIQUE(alert_id, market_event_id)
```

This prevents concurrent workers or duplicate event delivery from creating
duplicate logical alerts.

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

- Python
- FastAPI
- Pydantic
- Uvicorn
- Psycopg 3
- Redis Python client
- HTTPX
- Groww Python SDK

### Infrastructure

- PostgreSQL 16
- Redis 7
- Redis Streams
- Docker Compose
- SQLite/WAL fallback for offline development

## Project structure

```text
Groww/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── router.py
│   │   │   └── websocket.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── events.py
│   │   │   └── market_stream.py
│   │   ├── db/
│   │   │   ├── database.py
│   │   │   └── schema.sql
│   │   ├── services/
│   │   │   ├── alert_engine.py
│   │   │   ├── change_detector.py
│   │   │   ├── notification_service.py
│   │   │   ├── provider_adapter.py
│   │   │   ├── groww_service.py
│   │   │   ├── indian_stock_service.py
│   │   │   ├── news_timeline.py
│   │   │   └── similarity_engine.py
│   │   └── main.py
│   └── tests/
│       └── test_backend.py
├── frontend/
│   └── src/
├── docs/
│   ├── architecture.md
│   ├── failure-scenarios.md
│   ├── implementation_plan.md
│   └── project-status.md
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

## Requirements

- macOS, Linux, or Windows
- Python 3.12+
- Node.js 18+
- Docker Desktop
- Docker Compose

## Setup

### 1. Start infrastructure

```bash
cd /Users/shasmitha_r/Desktop/Groww
docker compose up -d
docker compose ps
```

The included Compose file starts:

| Service | Image | Host port |
| --- | --- | --- |
| PostgreSQL | `postgres:16-alpine` | `55432` |
| Redis | `redis:7-alpine` | `6379` |

Port `55432` is intentional because port `5432` may already be occupied by a
native PostgreSQL installation.

### 2. Configure environment

```bash
cp .env.example .env
```

Local infrastructure defaults:

```env
DATABASE_URL=postgresql://groww:groww@localhost:55432/groww_lens
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=true
```

The backend automatically creates the schema and seeds demo data.

### 3. Install backend dependencies

```bash
./venv/bin/python -m pip install -r requirements.txt
```

If you do not have a virtual environment:

```bash
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
```

### 4. Start the backend

```bash
./venv/bin/uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --app-dir backend
```

Backend: <http://localhost:8000>

Health check:

```bash
curl http://localhost:8000/api/system/health
```

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: <http://localhost:5173>

For a single-port deployment, build the frontend and start the backend:

```bash
cd frontend
npm run build
cd ..
./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir backend
```

## Configuration and credentials

### Required for local infrastructure

No credentials are required from the user. Docker Compose creates:

```text
PostgreSQL user:     groww
PostgreSQL password: groww
PostgreSQL database: groww_lens
Redis:               no password
```

### Optional external credentials

The product works with simulator and seeded data without external keys.

| Variable | Purpose |
| --- | --- |
| `GROWW_API_KEY` | Groww SDK market/account access |
| `GROWW_API_SECRET` | Groww SDK authentication |
| `INDIAN_STOCK_API_KEY` | News, trending data, and sector peers |
| `RESEND_API_KEY` | Real email notification delivery |
| `RESEND_FROM_EMAIL` | Sender address for Resend |
| `FINNHUB_API_KEY` | Reserved provider integration |
| `TWELVEDATA_API_KEY` | Reserved provider integration |

Never commit `.env` or provider secrets. `.env` is ignored by Git.

## REST API reference

All REST endpoints use the `/api` prefix.

### System and market

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/system/health` | Database, broker, data-quality, and service health |
| GET | `/api/indices` | NIFTY, SENSEX, BANKNIFTY, MIDCPNIFTY, FINNIFTY |
| GET | `/api/heatmap` | Market heatmap summary |
| GET | `/api/heatmap/data` | Heatmap tile data |
| POST | `/api/simulator/anomaly` | Inject a demo market anomaly |
| POST | `/api/settings/simulation-mode` | Enable or disable simulation mode |

### Groww integration

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/groww/quote` | Quote, OHLC, volume, and daily change |
| GET | `/api/groww/ltp` | Last traded prices for symbols |
| GET | `/api/groww/ohlc` | OHLC data for symbols |
| GET | `/api/groww/profile` | Groww user profile |
| GET | `/api/groww/holdings` | Groww holdings |
| GET | `/api/groww/margin` | Available cash and margin |

### Watchlists

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/watchlists` | List watchlists and enriched items |
| POST | `/api/watchlists` | Create a watchlist |
| DELETE | `/api/watchlists/{watchlist_id}` | Delete a watchlist |
| POST | `/api/watchlists/{watchlist_id}/items` | Add a symbol |
| DELETE | `/api/watchlists/{watchlist_id}/items/{symbol}` | Remove a symbol |
| POST | `/api/watchlists/{watchlist_id}/items/{symbol}/pin` | Atomically toggle pin |
| GET | `/api/what-changed` | Changes since last seen state |
| POST | `/api/mark-seen` | Update the current seen baseline |

### Stock analysis

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/stocks/{symbol}` | Current stock intelligence |
| GET | `/api/stocks/{symbol}/history` | Chart/candle history |
| GET | `/api/stocks/{symbol}/volume-orderbook` | Volume and order-book view |
| GET | `/api/stocks/{symbol}/timeline` | News-to-market reaction timeline |
| GET | `/api/stocks/{symbol}/related` | Related stocks |
| GET | `/api/stocks/{symbol}/peers` | Provider-backed sector peers |
| GET | `/api/news/feed` | Market news feed |

### Alerts and notifications

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/alerts` | List alerts |
| POST | `/api/alerts` | Create a price alert |
| DELETE | `/api/alerts/{alert_id}` | Delete an alert |
| POST | `/api/alerts/simulate-race` | Demonstrate duplicate suppression |
| GET | `/api/notifications` | List in-app notifications |
| POST | `/api/notifications/mark-read` | Mark notifications read |
| GET | `/api/emails` | Email delivery audit log |
| GET | `/api/devices` | Connected device sessions |

### Orders

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/orders` | List simulated orders |
| POST | `/api/orders` | Execute simulated buy/sell order |

## WebSocket API

Connect to:

```text
ws://localhost:8000/ws?user_id=user_harish&device_id=dev_browser&device_name=MacBook%20Pro&device_type=desktop
```

Server messages:

- `CONNECTED`
- `TICK`
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

## Database

The schema is in [`backend/app/db/schema.sql`](backend/app/db/schema.sql).
Tables include:

- `users`
- `devices`
- `watchlists`
- `watchlist_items`
- `alerts`
- `alert_events`
- `market_snapshots`
- `technical_signals`
- `news_items`
- `notifications`
- `notification_jobs`
- `orders`
- `portfolio_holdings`

PostgreSQL is the preferred runtime database. SQLite remains available for
offline tests and development when PostgreSQL is unavailable.

## Testing and quality checks

Backend tests:

```bash
./venv/bin/pytest backend/tests/test_backend.py
```

Backend compilation:

```bash
./venv/bin/python -m compileall -q backend/app
```

Frontend build:

```bash
cd frontend
npm run build
```

Frontend lint:

```bash
npm run lint
```

## Current limitations

- Demo authentication uses the fixed user `user_harish`.
- Market simulation is the practical default without external provider keys.
- Notification emails run in the API process; a separate worker is a future step.
- News timelines contain deterministic demo correlation data for supported symbols.
- The API is not a broker execution system; orders are simulated and persisted.

For the detailed implementation audit, migration notes, failure scenarios, and
future roadmap, see [`docs/project-status.md`](docs/project-status.md).

## License

This project is a technical demonstration built for the Groww challenge.

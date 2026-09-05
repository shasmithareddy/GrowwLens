# GrowwLens System Architecture

GrowwLens is an event-driven market intelligence platform designed around the philosophy:
> **"Clean surface. Deep system."**

```
                  ┌─────────────────────────────────────┐
                  │          GrowwLens Frontend         │
                  │   Next.js / Vite React + Tailwind   │
                  │   Groww UI Precision + TradingView  │
                  └──────────────────┬──────────────────┘
                                     │ HTTPS / WSS
                                     ▼
                  ┌─────────────────────────────────────┐
                  │            FastAPI Gateway          │
                  │  REST API + WebSocket Multiplexer   │
                  └───────┬─────────────────────┬───────┘
                          │                     │
               ┌──────────┴──────────┐   ┌──────┴──────────────┐
               │  Watchlist Service  │   │ Market Ingestion    │
               │  CRUD & State Diffs │   │ + Adapter Layer     │
               └──────────┬──────────┘   └──────┬──────────────┘
                          │                     │ Canonical MarketEvents
                          │                     ▼
                          │        ┌───────────────────────────┐
                          │        │ Redis Streams / Event Bus │
                          │        └────────────┬──────────────┘
                          │                     │
                  ┌───────┴──────────┐          ├──────────────────────────┐
                  │ Relational DB    │          ▼                          ▼
                  │ PostgreSQL /     │   ┌──────────────┐          ┌──────────────┐
                  │ SQLite (WAL)     │   │ Change Engine│          │ Alert Engine │
                  │ Source of Truth  │   │ Attention    │          │ Stateful &   │
                  └───────┬──────────┘   │ Vol Anomaly  │          │ Idempotent   │
                          │              └──────┬───────┘          └──────┬───────┘
                          │                     │                         │
                          │                     ▼                         ▼
                          │              ┌──────────────┐          ┌──────────────┐
                          │              │ WS Fanout    │          │ Notification │
                          │              │ All Devices  │          │ Worker (Mail)│
                          │              └──────────────┘          └──────────────┘
                          │
                          ▼
            [Device 1: Laptop] ◄─── Sync ───► [Device 2: Phone]
```

## Core Principles
1. **The Backend is the Source of Truth**: Clients never synchronize peer-to-peer; state is strictly reconciled through the backend.
2. **Events over Polling**: All price, volume, and technical updates flow through an event engine.
3. **Idempotency over Duplication**: Every alert event is constrained by a composite unique key `(alert_id, market_event_id)`.
4. **Cache for Speed, Database for Truth**: Redis and memory stores hold ephemeral ticks and pub/sub channels; relational tables store durable financial state.
5. **Meaningful Change Detection**: Raw ticks are transformed into actionable human context (Volume anomalies, EMA crossovers, signed volume pressure, attention scores).

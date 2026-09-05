# ADR 002: Redis Streams & Pub/Sub for Event Fanout & Ephemeral Caching

## Context & Problem
Market updates generate high-frequency tick events (multiple updates per second across tracked symbols). Polling the persistent database or opening raw DB listeners per WebSocket client would bottleneck the relational database.

## Decision
The production architecture supports Redis Streams for decoupled asynchronous event streaming and Redis Pub/Sub for WebSocket gateway fanout. The current single-node deployment intentionally uses an in-process asyncio listener bus with the same event and mutation semantics; Redis is a pluggable adapter for multi-instance deployments and is not required for the demo runtime.

## Alternatives Considered
1. **Direct Database Polling**: Clients query `GET /stocks` every 1000ms. High database load, high latency, poor scalability.
2. **Direct Point-to-Point HTTP Webhooks**: Tightly couples services; prone to cascading failures during network timeouts.

## Key Trade-offs
- Redis memory must be budgeted.
- Ephemeral streams require checkpointing / consumer group acknowledgment.

## Rationale & Why
- Database is the source of truth; Redis is the engine for speed and coordination.
- Redis Streams enable consumer groups: workers process events independently and can be horizontally scaled across symbol partitions using `hash(symbol) % N`.
- `/api/system/health` reports the active broker honestly as `In-Process Asyncio Event Bus (Pluggable Redis Streams Architecture)` when Redis is not configured.

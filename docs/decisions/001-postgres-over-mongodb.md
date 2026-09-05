# ADR 001: Relational ACID Storage (PostgreSQL / SQLite WAL) over Document Stores (MongoDB)

## Context & Problem
A real-time financial watchlist system processes price movements, technical crossovers, and stateful alerts where race conditions directly impact correctness. If two workers evaluate an alert simultaneously for a user with three open devices, duplicate alerts or contradictory state transitions must be mathematically impossible.

## Decision
We choose a relational ACID database model using PostgreSQL / CockroachDB (and SQLite in Write-Ahead-Logging mode for zero-dependency local verification) over NoSQL document stores like MongoDB.

## Alternatives Considered
1. **MongoDB / DynamoDB**: Excellent for unconstrained schema flexibility, but lack native row-level `SELECT ... FOR UPDATE` serializable semantics without complex distributed 2-phase locks.
2. **Pure Redis Cache as Database**: Low latency, but loses durable ACID transactional guarantees upon failover and is prone to data loss on eviction.

## Key Trade-offs
- Strict schemas require migrations and indexed joins.
- Slight overhead on writes compared to unindexed document appends, but negligible at our required throughput.

## Rationale & Why
1. **Row-Level Locking**: Relational engines provide `BEGIN IMMEDIATE` / `SELECT ... FOR UPDATE`, guaranteeing that only one worker can transition an alert from `ARMED` to `TRIGGERED`.
2. **Idempotency Constraints**: Relational composite unique constraints `UNIQUE(alert_id, market_event_id)` prevent duplicate trigger events at the storage layer regardless of application retry spikes.
3. **Consistency over Cleverness**: Financial state transitions require strict ACID guarantees.

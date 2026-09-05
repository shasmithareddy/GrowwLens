# ADR 005: Normalized Canonical Market Event Schema & Provider Abstraction

## Context & Problem
Different market data providers (Finnhub, Twelve Data, Massive, NSE feed providers) have divergent WebSocket formats, field naming, and latency characteristics. Directly exposing provider schemas to the frontend creates severe architectural coupling.

## Decision
We decouple ingestion using a Provider Adapter layer that ingests external ticks and normalizes them into a canonical `MarketEvent` schema before publishing into the internal event stream.

## Alternatives Considered
1. **Frontend Direct Provider Connection**: TradingView or Frontend directly connects to Finnhub WebSocket. Fails to allow centralized server-side change detection, alert evaluation, or cross-device synchronization.

## Key Trade-offs
- Ingestion worker introduces an internal hop (<1ms latency), but completely isolates external provider changes.

## Rationale & Why
- Makes the data provider 100% swappable without changing a single line of frontend code or alert evaluation logic.
- Enables seamless fallback from primary provider to secondary provider, or to a deterministic high-fidelity simulator during market off-hours.

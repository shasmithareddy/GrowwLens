# ADR 003: Push-Based WebSockets over Client Polling for Market Ticks & Cross-Device Sync

## Context & Problem
Investors and active traders require instantaneous notifications of price breakouts and technical crossovers. Furthermore, changes made on one device (e.g. adding a stock on MacBook) must immediately appear on another (iPhone / iPad) without manual browser refreshes.

## Decision
We implement a bidirectional WebSocket Gateway that maintains persistent, stateful multiplexed client connections.

## Alternatives Considered
1. **Short Polling (1–3s intervals)**: Wasteful HTTP request overhead, TLS renegotiation overhead, high battery consumption on mobile devices.
2. **Server-Sent Events (SSE)**: Unidirectional only; requires a separate HTTP POST channel for client-to-server mutations and device sync.

## Key Trade-offs
- WebSocket connections require persistent memory overhead per active client and heartbeat ping/pong keepalives.
- Reconnection backoff logic is required on the frontend.

## Rationale & Why
- 1000 connected clients receive tick diffs via one shared backend market ingestion connection, rather than 1000 separate external provider subscriptions.
- Enables instant multi-device synchronization: Client A mutates state $\rightarrow$ Backend notifies Client B and C within 10ms.

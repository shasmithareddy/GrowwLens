# ADR 004: Idempotent Alert Processing & Stateful Transitions

## Context & Problem
When a stock price fluctuates rapidly around an alert threshold (e.g. $240.01, $239.99, $240.02), naive alert triggers would send dozens of spam notifications. Moreover, in a multi-worker distributed architecture, multiple workers might ingest the same tick concurrently, triggering duplicate alerts and double emails.

## Decision
We enforce a strict 4-state finite state machine (`ARMED` $\rightarrow$ `TRIGGERED` $\rightarrow$ `COOLDOWN` $\rightarrow$ `RE-ARMED`) combined with row-level transaction locks (`BEGIN IMMEDIATE` / `SELECT ... FOR UPDATE`) and an idempotency key `UNIQUE(alert_id, market_event_id)`.

## Alternatives Considered
1. **Client-side Alert Evaluation**: Extremely dangerous; depends on browser being open and leads to duplicate alerts on multi-tab/multi-device setups.
2. **Distributed Redis Locks (`Redlock`)**: Adds subtle split-brain edge cases and clock drift vulnerabilities for safety-critical states.

## Key Trade-offs
- Requires managing a cooldown timer before re-arming the alert.

## Rationale & Why
- **One Logical Alert per Event**: Even if 10 devices are connected and 4 workers process the same tick, only one worker acquires the row lock, successfully transitions the state, and writes the unique `(alert_id, market_event_id)` entry.
- The single resulting `AlertEvent` is then broadcast to all user devices and enqueued for asynchronous email delivery.

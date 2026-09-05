# GrowwLens Failure Scenarios & Resilience Matrix

Engineering depth is proven not by how systems behave on the happy path, but by how they handle failure, concurrency, network partitions, and data degradation. GrowwLens handles all of the following:

---

### 1. Concurrent Workers Processing the Same Alert (Race Condition)
- **Failure Risk**: Two background workers receive tick `BPCL ₹320.50` simultaneously. Naive code without concurrency controls would transition both, sending 2 emails and 2 duplicate alerts.
- **Resilience Mechanism**:
  - Worker A acquires an immediate transactional row lock (`BEGIN IMMEDIATE` / `SELECT ... FOR UPDATE` in PostgreSQL).
  - Worker A verifies `status == 'ARMED'`, transitions status to `'TRIGGERED'`, sets cooldown expiry, and inserts the `(alert_id, market_event_id)` record.
  - Worker B arrives: blocked until Worker A commits. Upon acquiring lock, Worker B queries status and sees `'TRIGGERED'`, safely aborting.
  - Furthermore, `UNIQUE(alert_id, market_event_id)` at the database constraint level guarantees idempotency even if lock timeouts occur.
  - **Verification**: Built-in interactive test (`POST /api/alerts/simulate-race`) runs two concurrent threads and displays the serialized execution trace.

---

### 2. Multi-Device Single-User Alert Fanout
- **Failure Risk**: User has MacBook Pro, iPhone 16, and iPad Air connected simultaneously. When an alert triggers, naive systems might fire 3 alert evaluations or deliver duplicates.
- **Resilience Mechanism**:
  - The backend evaluates the alert **once**, generating **one** `AlertEvent` ID.
  - The `NotificationService` retrieves all active WebSocket connections for `user_harish` and dispatches the single alert event in parallel to all connected device sockets.
  - Exactly one email job is enqueued.

---

### 3. External Market Data Provider Disconnect & Stale Data
- **Failure Risk**: If Finnhub or Twelve Data WebSocket disconnects or network drops, an application might keep showing old prices without alerting the trader, leading to bad financial decisions.
- **Resilience Mechanism**:
  - The backend tracks `last_tick_time` per symbol and globally.
  - If `now - last_tick_time < 5s`: Marked as **`Live ●`** (Green).
  - If `5s <= lag < 15s`: Marked as **`Delayed • Xs`** (Amber).
  - If `lag >= 15s`: Marked as **`Stale • Xs`** (Red alert badge), warning the user that live prices are unconfirmed.
  - Frontend prominently renders this data quality badge in the navigation bar.

---

### 4. Duplicate Ingestion of the Same Market Tick
- **Failure Risk**: Network retries or duplicate webhook delivery cause the exact same tick to be received multiple times.
- **Resilience Mechanism**:
  - Each market event carries a deterministic sequence number and timestamp.
  - Downstream analytical engines and alert evaluators key off `market_event_id`. Duplicate event processing is rejected at the database unique constraint level.

---

### 5. Client WebSocket Disconnect & Exponential Reconnection
- **Failure Risk**: User closes laptop lid or loses cellular connection; stale data or missed alerts occur upon reconnection.
- **Resilience Mechanism**:
  - Client WebSocket hook implements exponential backoff reconnection (1s, 2s, 4s, 8s max).
  - Upon reconnection, the client automatically requests `/api/what-changed` to reconcile all changes and missed alerts that occurred while offline.

---

### 6. Email Dispatch Failure & Non-Blocking Resilience
- **Failure Risk**: If the external email API (Resend) experiences rate limiting or downtime, the market tick thread could block or crash.
- **Resilience Mechanism**:
  - Email dispatch is completely decoupled from the tick ingestion loop.
  - An asynchronous background job is queued in `notification_jobs` with status `'PENDING'`.
  - Failures are caught, logged, and marked as `'FAILED'` for background retry without impacting real-time UI streaming.

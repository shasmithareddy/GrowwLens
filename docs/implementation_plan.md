# GrowwLens Bug Fix & Real Data Audit Remediation Plan

This implementation plan addresses all 9 priority items identified in the functional audit report, ensuring the backend test suite passes deterministically, dead/duplicate code is eliminated, React hooks violations are resolved, Buy/Sell order execution is backed by real database persistence and cross-device sync, hardcoded URLs are removed, and the system behaves truthfully and reliably in both Simulation ON and Simulation OFF modes.

---

## User Review Required

> [!IMPORTANT]
> **API Credentials for Simulation OFF Mode**:
> In Simulation OFF mode, the backend connects to real market data providers (`growwapi` and `IndianStockAPI`). We will create a `.env.example` file and configure `.env` support. If you have active API tokens or secrets you want to use, you can provide them or place them in `.env`. The system will also include resilient, non-zero API fallback mechanisms that preserve genuine exchange closing prices when markets are closed without fake jitter.

---

## Proposed Changes

### 1. Test Suite Fixes & Deterministic Mocking (`backend/tests/`)

#### [MODIFY] [test_backend.py](file:///Users/shasmitha_r/Desktop/Groww/backend/tests/test_backend.py)
- **Database Initialization Test**:
  - Update email assertion from `"harish@groww.in"` to `"shasmitha@groww.in"` (matching `backend/app/db/database.py`).
- **Groww SDK Live Data Test**:
  - Make `test_groww_sdk_live_data` deterministic by using `unittest.mock.patch` for `GrowwAPI` / `live_data_allowed()` so tests pass 100% of the time regardless of day of week, market hours, or external network availability.
  - Test both authenticated SDK response and offline graceful error handling.

---

### 2. Backend Services & Duplication Cleanup (`backend/app/services/`)

#### [MODIFY] [provider_adapter.py](file:///Users/shasmitha_r/Desktop/Groww/backend/app/services/provider_adapter.py)
- **Delete Duplicate Methods**: Remove the first (dead) definition of `sync_real_groww_data_now()` and `register_listener()`.
- **Simulation OFF Mode Architecture**:
  - In simulation OFF mode when market is closed (weekends/off-hours): Synchronize genuine market quotes once via real APIs and keep them static (no random walk fluctuations).
  - In simulation OFF mode when market is open: Fetch real-time quotes without random jitter.
  - Relabel static seed metadata from `"source": "GROWW_LIVE_API"` to `"source": "SEED_SNAPSHOT"`, updating to `"GROWW_LIVE_API"` only upon actual verification from the API.

#### [MODIFY] [groww_service.py](file:///Users/shasmitha_r/Desktop/Groww/backend/app/services/groww_service.py)
- **Remove Artificial Market-Hours Gates on Read Endpoints**:
  - Remove `if not live_data_allowed(): return {}` from `get_quote`, `get_ltp`, and `get_ohlc`. Exchange closing quotes are valid and readable 24/7.
- **Explicit Error Signaling (No Silent Zeros)**:
  - When network or credentials fail, do not return `{ "last_price": 0.0, ... }` without an error flag. Return explicit status: `{"status": "UNAVAILABLE", "error": "Provider offline", "last_price": ...}` or raise an HTTPException on the REST endpoint so clients are never misled by silent zeros.

#### [MODIFY] [indian_stock_service.py](file:///Users/shasmitha_r/Desktop/Groww/backend/app/services/indian_stock_service.py)
- Remove `live_data_allowed()` block on news and industry search so market news and sector peers can be fetched 24/7 with TTL caching.

#### [MODIFY] [similarity_engine.py](file:///Users/shasmitha_r/Desktop/Groww/backend/app/services/similarity_engine.py)
- Replace static 7-symbol dictionary with dynamic sector-based peer matching and Pearson return correlation calculation against the active watchlist catalog.

---

### 3. Database & Real Buy/Sell Orders (`backend/app/db/` & `backend/app/api/`)

#### [MODIFY] [database.py](file:///Users/shasmitha_r/Desktop/Groww/backend/app/db/database.py)
- Add `orders` table schema:
  ```sql
  CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      action TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      order_type TEXT NOT NULL,
      product_type TEXT NOT NULL,
      status TEXT NOT NULL,
      executed_at REAL NOT NULL,
      groww_order_id TEXT
  );
  ```

#### [MODIFY] [router.py](file:///Users/shasmitha_r/Desktop/Groww/backend/app/api/router.py)
- **Real Order Endpoints**:
  - `POST /api/orders`: Validates order, writes to `orders` table, updates `shares_held` in `stocks_data` and SQLite, and broadcasts a `CROSS_DEVICE_MUTATION` (`ORDER_EXECUTED`) so all open devices reflect the holding update.
  - `GET /api/orders`: Returns list of executed orders.
- **Atomic Pin Toggle (Fix TOCTOU Race)**:
  - Refactor `toggle_pin_watchlist_item` to use `get_locked_db()` and atomic SQL:
    `UPDATE watchlist_items SET is_pinned = 1 - COALESCE(is_pinned, 0) WHERE watchlist_id = ? AND symbol = ?`.
- **Alert Validation**:
  - Validate `condition` in `CreateAlertRequest` using Pydantic `Literal["GREATER_THAN", "LESS_THAN"]` and `threshold > 0`.
- **System Health Honesty**:
  - Update `event_broker` in `/api/system/health` to `"In-Process Asyncio Event Bus (Pluggable Redis Architecture)"`.
- **Candle Helper Extraction**:
  - Extract candle computation from `get_stock_history` route into a reusable helper `generate_candles(info, timeframe)`.

---

### 4. Frontend Fixes: React Hooks, URLs, & Live Quality Badge (`frontend/src/`)

#### [NEW] [config.ts](file:///Users/shasmitha_r/Desktop/Groww/frontend/src/api/config.ts)
- Define centralized `API_BASE` and `WS_BASE` using `window.location.origin` and `window.location.host`, with fallback to `http://localhost:8000` when running via Vite dev server on port 5173.

#### [MODIFY] [App.tsx](file:///Users/shasmitha_r/Desktop/Groww/frontend/src/App.tsx)
- Replace all hardcoded `http://localhost:8000` URLs with `API_BASE`.
- Connect `handleExecuteOrder` to `POST /api/orders` so placing an order genuinely executes on the backend and updates portfolio holdings.

#### [MODIFY] [useMarketWebSocket.ts](file:///Users/shasmitha_r/Desktop/Groww/frontend/src/hooks/useMarketWebSocket.ts)
- Use `WS_BASE` instead of hardcoded port `8000`.
- Fetch real data quality state from `GET /api/system/health` on connect and reconnect rather than hardcoding `{ status: 'LIVE', latency_ms: 18.4 }`.

#### [MODIFY] [BuySellModal.tsx](file:///Users/shasmitha_r/Desktop/Groww/frontend/src/components/BuySellModal.tsx)
- Fix React Rules of Hooks violation: Move all `useState` calls to top-level before `if (!isOpen || !stock) return null`.

#### [MODIFY] [TriggerOrderModal.tsx](file:///Users/shasmitha_r/Desktop/Groww/frontend/src/components/TriggerOrderModal.tsx)
- Fix React Rules of Hooks violation: Move all `useState` calls to top-level before `if (!isOpen || !stock) return null`.

#### [MODIFY] [AddStockModal.tsx](file:///Users/shasmitha_r/Desktop/Groww/frontend/src/components/AddStockModal.tsx)
- Fix React Rules of Hooks violation: Move `useState` to top-level before `if (!isOpen) return null`.

#### [MODIFY] [GrowwTerminal.tsx](file:///Users/shasmitha_r/Desktop/Groww/frontend/src/components/GrowwTerminal.tsx)
- Fix React Rules of Hooks violation: Move all `useState` and `useEffect` calls before `if (!isOpen || !stock) return null`.
- Replace hardcoded `http://localhost:8000` URLs with `API_BASE`.

#### [MODIFY] [WatchlistTable.tsx, NewsSideDrawer.tsx, RaceConditionDemo.tsx]
- Replace all hardcoded `http://localhost:8000` URLs with `API_BASE`.

---

### 5. Packaging, Hygiene, & ADRs

#### [NEW] [.gitignore](file:///Users/shasmitha_r/Desktop/Groww/.gitignore)
- Ignore `venv/`, `node_modules/`, `frontend/node_modules/`, `*.pyc`, `__pycache__/`, `dist/`, `.env`, `*.db`.

#### [NEW] [.env.example](file:///Users/shasmitha_r/Desktop/Groww/.env.example)
- Provide template for `GROWW_API_KEY`, `GROWW_API_SECRET`, and `INDIAN_STOCK_API_KEY`.

#### [MODIFY] [002-redis-for-event-fanout.md](file:///Users/shasmitha_r/Desktop/Groww/docs/decisions/002-redis-for-event-fanout.md)
- Clarify in the decision record that single-node deployment uses the in-process asyncio event bus implementing the exact same stream fanout semantics, with pluggable Redis adapter for multi-instance deployments.

---

## Verification Plan

### Automated Tests
1. Run pytest suite:
   ```bash
   venv/bin/pytest -v backend/tests/test_backend.py
   ```
   All 4 tests must pass out-of-the-box (100% green).

2. Lint check:
   ```bash
   cd frontend && npx oxlint -D rules-of-hooks
   ```
   Must pass with 0 errors.

3. Frontend TypeScript & production build check:
   ```bash
   cd frontend && npm run build
   ```
   Must build cleanly with 0 type errors.

### Manual Verification
1. Open terminal and verify Buy/Sell: Place a BUY order for 20 shares of BPCL; verify `shares_held` updates in WatchlistTable, GrowwTerminal overview, and SQLite `orders` table.
2. Toggle pin on a stock and verify it updates atomically without errors.
3. Test Simulation ON vs Simulation OFF:
   - In Simulation OFF mode: Verify prices remain authentic and steady outside market hours, with no fake jitter.
   - In Simulation ON mode: Verify demo ticks stream smoothly.
4. Verify all modals open and close cleanly without any React hook warnings in console.

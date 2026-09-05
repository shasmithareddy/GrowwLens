-- GrowwLens Relational Database Schema
-- Compatible with PostgreSQL, CockroachDB, and SQLite (WAL Mode)

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL,
    websocket_id TEXT,
    last_seen_at REAL NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS watchlists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS watchlist_items (
    id TEXT PRIMARY KEY,
    watchlist_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    company_name TEXT NOT NULL,
    sector TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    is_pinned INTEGER DEFAULT 0,
    added_at REAL NOT NULL,
    added_price REAL DEFAULT 0.0,
    last_seen_at REAL NOT NULL,
    last_seen_price REAL DEFAULT 0.0,
    last_seen_volume INTEGER DEFAULT 0,
    last_seen_attention_score INTEGER DEFAULT 0,
    FOREIGN KEY(watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
    UNIQUE(watchlist_id, symbol)
);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    alert_type TEXT NOT NULL DEFAULT 'PRICE',
    condition TEXT NOT NULL DEFAULT 'GREATER_THAN',
    threshold REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'ARMED', -- ARMED, TRIGGERED, COOLDOWN, DISABLED
    cooldown_until REAL,
    note TEXT,
    created_at REAL NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alert_events (
    id TEXT PRIMARY KEY,
    alert_id TEXT NOT NULL,
    market_event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    trigger_price REAL NOT NULL,
    threshold REAL NOT NULL,
    triggered_at REAL NOT NULL,
    message TEXT NOT NULL,
    FOREIGN KEY(alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    UNIQUE(alert_id, market_event_id) -- IDEMPOTENCY KEY: guarantees one logical trigger per event
);

CREATE TABLE IF NOT EXISTS market_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    timestamp REAL NOT NULL,
    price REAL NOT NULL,
    volume INTEGER NOT NULL,
    day_open REAL NOT NULL,
    day_high REAL NOT NULL,
    day_low REAL NOT NULL,
    prev_close REAL NOT NULL,
    source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS technical_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    timestamp REAL NOT NULL,
    ema20 REAL NOT NULL,
    ema50 REAL NOT NULL,
    volume_ratio REAL NOT NULL,
    is_anomaly INTEGER DEFAULT 0,
    buy_pressure REAL NOT NULL,
    sell_pressure REAL NOT NULL,
    volatility_5m REAL NOT NULL,
    attention_score INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS news_items (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    headline TEXT NOT NULL,
    source TEXT NOT NULL,
    summary TEXT NOT NULL,
    impact TEXT NOT NULL DEFAULT 'NEUTRAL',
    published_at REAL NOT NULL,
    url TEXT DEFAULT '#'
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'IN_APP',
    status TEXT NOT NULL DEFAULT 'DELIVERED',
    read INTEGER DEFAULT 0,
    created_at REAL NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_jobs (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    channel TEXT NOT NULL, -- 'EMAIL', 'WEBSOCKET'
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, SENT, FAILED
    attempt_count INTEGER DEFAULT 0,
    next_retry_at REAL,
    created_at REAL NOT NULL,
    sent_at REAL,
    error_message TEXT
);

-- Production Indexes on hot query paths
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_symbol ON watchlist_items(symbol);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_wl ON watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_market_symbol_time ON market_snapshots(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alert_active ON alerts(symbol, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_time ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_events_idemp ON alert_events(alert_id, market_event_id);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    action TEXT NOT NULL, -- 'BUY', 'SELL'
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    order_type TEXT NOT NULL DEFAULT 'Market', -- 'Market', 'Limit'
    product_type TEXT NOT NULL DEFAULT 'Delivery', -- 'Delivery', 'Intraday', 'MTF'
    status TEXT NOT NULL DEFAULT 'EXECUTED', -- 'EXECUTED', 'PENDING', 'REJECTED'
    executed_at REAL NOT NULL,
    groww_order_id TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_user_time ON orders(user_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);

CREATE TABLE IF NOT EXISTS portfolio_holdings (
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at REAL NOT NULL,
    PRIMARY KEY (user_id, symbol),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

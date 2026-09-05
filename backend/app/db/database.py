import sqlite3
import os
import time
import uuid
from typing import Dict, Any, List, Optional
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "groww_lens.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///groww_lens.db")
_postgres = DATABASE_URL.lower().startswith(("postgresql://", "postgres://"))
_postgres_unavailable = False


def backend_name() -> str:
    return "PostgreSQL" if _postgres and not _postgres_unavailable else "SQLite"


class _PostgresConnection:
    """Small DB-API compatibility layer so existing seed/query code stays portable."""
    is_postgres = True

    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql, params=()):
        sql = _adapt_sql(sql)
        return self._conn.execute(sql, params)

    def executemany(self, sql, params):
        with self._conn.cursor() as cursor:
            return cursor.executemany(_adapt_sql(sql), params)

    def executescript(self, sql):
        for statement in sql.split(";"):
            if statement.strip():
                self.execute(statement)

    def commit(self): self._conn.commit()
    def rollback(self): self._conn.rollback()
    def close(self): self._conn.close()


class _CompatRow(dict):
    """Row supporting both SQLite-style numeric and mapping access."""

    def __getitem__(self, key):
        if isinstance(key, int):
            return tuple(self.values())[key]
        return super().__getitem__(key)


def _adapt_sql(sql: str) -> str:
    sql = sql.replace("INSERT OR IGNORE INTO", "INSERT INTO")
    if "INSERT INTO" in sql and "ON CONFLICT" not in sql and "watchlist_items" in sql:
        sql = sql.rstrip().rstrip(";") + " ON CONFLICT (watchlist_id, symbol) DO NOTHING"
    return sql.replace("?", "%s")


def _connect_postgres():
    import psycopg
    from psycopg.rows import dict_row

    def compat_row(cursor):
        make_row = dict_row(cursor)
        return lambda values: _CompatRow(make_row(values))

    return _PostgresConnection(psycopg.connect(DATABASE_URL, row_factory=compat_row))

def get_connection():
    global _postgres_unavailable
    if _postgres and not _postgres_unavailable:
        try:
            return _connect_postgres()
        except Exception:
            # Local tests/dev remain usable when Docker/Postgres is not running.
            _postgres_unavailable = True
    conn = sqlite3.connect(DB_PATH, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

@contextmanager
def get_locked_db():
    conn = get_connection()
    try:
        if getattr(conn, "is_postgres", False):
            # PostgreSQL serializes the critical section with row-level FOR UPDATE
            # in callers; this transaction only establishes the lock scope.
            conn.execute("BEGIN;")
        else:
            conn.execute("BEGIN IMMEDIATE;")
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with open(SCHEMA_PATH, "r") as f:
        schema_sql = f.read()
    
    conn = get_connection()
    try:
        if getattr(conn, "is_postgres", False):
            schema_sql = schema_sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "BIGSERIAL PRIMARY KEY")
        conn.executescript(schema_sql)
        ensure_schema_migrations(conn)
        seed_default_data(conn)
        populate_all_watchlists(conn)
        conn.execute("UPDATE watchlist_items SET added_price = last_seen_price WHERE COALESCE(added_price, 0) = 0")
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def ensure_schema_migrations(conn):
    """Safely adds new columns/tables if existing database file was created without them."""
    if getattr(conn, "is_postgres", False):
        cursor = conn.execute(
            "SELECT column_name AS name FROM information_schema.columns WHERE table_name = 'watchlist_items'"
        )
    else:
        cursor = conn.execute("PRAGMA table_info(watchlist_items);")
    columns = [row["name"] for row in cursor.fetchall()]
    if "is_pinned" not in columns:
        conn.execute("ALTER TABLE watchlist_items ADD COLUMN is_pinned INTEGER DEFAULT 0;")
    if "added_price" not in columns:
        conn.execute("ALTER TABLE watchlist_items ADD COLUMN added_price REAL DEFAULT 0.0;")
    conn.execute("UPDATE watchlist_items SET added_price = last_seen_price WHERE COALESCE(added_price, 0) = 0")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            action TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            order_type TEXT NOT NULL DEFAULT 'Market',
            product_type TEXT NOT NULL DEFAULT 'Delivery',
            status TEXT NOT NULL DEFAULT 'EXECUTED',
            executed_at REAL NOT NULL,
            groww_order_id TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_orders_user_time ON orders(user_id, executed_at DESC);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS portfolio_holdings (
            user_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            updated_at REAL NOT NULL,
            PRIMARY KEY (user_id, symbol),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)

def populate_all_watchlists(conn: sqlite3.Connection):
    """Ensures every watchlist has a full roster of active stocks."""
    now = time.time()
    
    # 1. Dekhte Raho / Defence & Infra
    dekhte_count = conn.execute("SELECT COUNT(*) FROM watchlist_items WHERE watchlist_id = 'wl_dekhte'").fetchone()[0]
    if dekhte_count == 0:
        dekhte_stocks = [
            (str(uuid.uuid4()), "wl_dekhte", "APOLLO", "Apollo Micro Systems", "Defence & Aerospace", 1, 0, now, now, 388.90, 4500219, 88),
            (str(uuid.uuid4()), "wl_dekhte", "PARAS", "Paras Defence And Space", "Defence & Aerospace", 2, 0, now, now, 1414.90, 552173, 76),
            (str(uuid.uuid4()), "wl_dekhte", "IDEAFORGE", "Ideaforge Technology", "Defence & Drone Tech", 3, 0, now, now, 777.05, 208626, 48),
            (str(uuid.uuid4()), "wl_dekhte", "RVNL", "Rail Vikas Nigam Ltd", "Infrastructure", 4, 0, now, now, 212.49, 6287421, 82),
            (str(uuid.uuid4()), "wl_dekhte", "HAL", "Hindustan Aeronautics Ltd", "Defence & Aerospace", 5, 0, now, now, 4280.00, 1820410, 85),
            (str(uuid.uuid4()), "wl_dekhte", "BEL", "Bharat Electronics Ltd", "Defence & Aerospace", 6, 0, now, now, 312.40, 7840190, 79),
            (str(uuid.uuid4()), "wl_dekhte", "BEML", "BEML Limited", "Heavy Engineering", 7, 0, now, now, 3950.00, 480120, 62),
            (str(uuid.uuid4()), "wl_dekhte", "MAZDOCK", "Mazagon Dock Shipbuilders", "Defence & Marine", 8, 0, now, now, 4310.00, 950400, 91),
        ]
        conn.executemany(
            """INSERT OR IGNORE INTO watchlist_items 
               (id, watchlist_id, symbol, company_name, sector, position, is_pinned, added_at, last_seen_at, last_seen_price, last_seen_volume, last_seen_attention_score) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            dekhte_stocks
        )

    # 2. Top Tech
    tech_count = conn.execute("SELECT COUNT(*) FROM watchlist_items WHERE watchlist_id = 'wl_toptech'").fetchone()[0]
    if tech_count == 0:
        tech_stocks = [
            (str(uuid.uuid4()), "wl_toptech", "TCS", "Tata Consultancy Services", "Information Technology", 1, 0, now, now, 2304.00, 2564322, 55),
            (str(uuid.uuid4()), "wl_toptech", "INFY", "Infosys Limited", "Information Technology", 2, 0, now, now, 1860.50, 4920190, 65),
            (str(uuid.uuid4()), "wl_toptech", "WIPRO", "Wipro Limited", "Information Technology", 3, 0, now, now, 520.10, 3120400, 48),
            (str(uuid.uuid4()), "wl_toptech", "HCLTECH", "HCL Technologies", "Information Technology", 4, 0, now, now, 1690.00, 1840200, 58),
            (str(uuid.uuid4()), "wl_toptech", "TECHM", "Tech Mahindra", "Information Technology", 5, 0, now, now, 1598.00, 1646825, 52),
            (str(uuid.uuid4()), "wl_toptech", "NVDA", "Nvidia Corporation", "Semiconductors", 6, 1, now, now, 176.24, 18450120, 94),
            (str(uuid.uuid4()), "wl_toptech", "AAPL", "Apple Inc.", "Consumer Electronics", 7, 0, now, now, 234.82, 14230190, 82),
            (str(uuid.uuid4()), "wl_toptech", "TSLA", "Tesla Inc.", "Clean Tech & EV", 8, 0, now, now, 416.85, 22194000, 89),
            (str(uuid.uuid4()), "wl_toptech", "MSFT", "Microsoft Corp", "Enterprise Software & Cloud", 9, 0, now, now, 448.20, 16820000, 88),
            (str(uuid.uuid4()), "wl_toptech", "GOOGL", "Alphabet Inc.", "AI & Search", 10, 0, now, now, 182.50, 15900000, 84),
        ]
        conn.executemany(
            """INSERT OR IGNORE INTO watchlist_items 
               (id, watchlist_id, symbol, company_name, sector, position, is_pinned, added_at, last_seen_at, last_seen_price, last_seen_volume, last_seen_attention_score) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            tech_stocks
        )

    # 3. Nifty Heavyweights
    nifty_count = conn.execute("SELECT COUNT(*) FROM watchlist_items WHERE watchlist_id = 'wl_nifty'").fetchone()[0]
    if nifty_count == 0:
        nifty_stocks = [
            (str(uuid.uuid4()), "wl_nifty", "RELIANCE", "Reliance Industries", "Energy & Retail", 1, 1, now, now, 1322.00, 13031534, 75),
            (str(uuid.uuid4()), "wl_nifty", "HDFCBANK", "HDFC Bank", "Financials & Banking", 2, 1, now, now, 712.10, 14488024, 71),
            (str(uuid.uuid4()), "wl_nifty", "ICICIBANK", "ICICI Bank", "Financials & Banking", 3, 0, now, now, 1245.00, 8920190, 68),
            (str(uuid.uuid4()), "wl_nifty", "INFY", "Infosys Limited", "Information Technology", 4, 0, now, now, 1860.50, 4920190, 65),
            (str(uuid.uuid4()), "wl_nifty", "ITC", "ITC Limited", "Consumer Goods", 5, 0, now, now, 482.30, 9410200, 60),
            (str(uuid.uuid4()), "wl_nifty", "LT", "Larsen & Toubro", "Capital Goods & Infra", 6, 0, now, now, 3620.00, 1920300, 72),
            (str(uuid.uuid4()), "wl_nifty", "SBIN", "State Bank of India", "Financials & Banking", 7, 0, now, now, 815.40, 11200300, 74),
            (str(uuid.uuid4()), "wl_nifty", "BHARTIARTL", "Bharti Airtel", "Telecommunications", 8, 0, now, now, 1680.00, 5120000, 79),
            (str(uuid.uuid4()), "wl_nifty", "BPCL", "Bharat Petroleum Corp", "Energy", 9, 0, now, now, 315.70, 1834819, 64),
            (str(uuid.uuid4()), "wl_nifty", "TATAMOTORS", "Tata Motors", "Automobile", 10, 0, now, now, 990.20, 6800100, 70),
        ]
        conn.executemany(
            """INSERT OR IGNORE INTO watchlist_items 
               (id, watchlist_id, symbol, company_name, sector, position, is_pinned, added_at, last_seen_at, last_seen_price, last_seen_volume, last_seen_attention_score) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            nifty_stocks
        )

    replace_dollar_watchlist_items(conn)


def replace_dollar_watchlist_items(conn: sqlite3.Connection):
    """Keep every seeded watchlist India-focused while preserving its rows."""
    replacements = {
        "wl_harish": {
            "NVDA": ("HAL", "Hindustan Aeronautics Ltd", "Defence & Aerospace", 4280.00),
            "AAPL": ("BEL", "Bharat Electronics Ltd", "Defence & Aerospace", 312.40),
            "TSLA": ("BEML", "BEML Limited", "Heavy Engineering", 3950.00),
        },
        "wl_toptech": {
            "NVDA": ("RELIANCE", "Reliance Industries", "Energy & Retail", 1322.00),
            "AAPL": ("HDFCBANK", "HDFC Bank", "Financials & Banking", 712.10),
            "TSLA": ("ICICIBANK", "ICICI Bank", "Financials & Banking", 1245.00),
            "MSFT": ("SBIN", "State Bank of India", "Financials & Banking", 815.40),
            "GOOGL": ("LT", "Larsen & Toubro", "Capital Goods & Infra", 3620.00),
        },
    }
    for watchlist_id, watchlist_replacements in replacements.items():
        for old_symbol, (new_symbol, company_name, sector, price) in watchlist_replacements.items():
            conn.execute(
                """UPDATE watchlist_items
                   SET symbol = ?, company_name = ?, sector = ?,
                       added_price = ?, last_seen_price = ?
                   WHERE watchlist_id = ? AND symbol = ?""",
                (new_symbol, company_name, sector, price, price, watchlist_id, old_symbol)
            )


def seed_default_data(conn: sqlite3.Connection):
    # Check if user exists
    user = conn.execute("SELECT id FROM users WHERE id = 'user_harish'").fetchone()
    if user:
        conn.execute(
            "UPDATE users SET email = ?, full_name = ?, avatar_url = ? WHERE id = ?",
            ("shasmitha@groww.in", "Shasmitha", "https://api.dicebear.com/7.x/avataaars/svg?seed=Shasmitha", "user_harish")
        )
        conn.execute("UPDATE watchlists SET name = ? WHERE id = ?", ("Shasmitha stocks", "wl_harish"))
        return

    now = time.time()
    # 1. Seed User
    conn.execute(
        "INSERT INTO users (id, email, full_name, avatar_url, created_at) VALUES (?, ?, ?, ?, ?)",
        ("user_harish", "shasmitha@groww.in", "Shasmitha", "https://api.dicebear.com/7.x/avataaars/svg?seed=Shasmitha", now)
    )

    # 2. Seed Devices (for cross-device synchronization)
    devices = [
        ("dev_macbook", "user_harish", "MacBook Pro 16\"", "desktop", "ws_desktop_1", now),
        ("dev_iphone", "user_harish", "iPhone 16 Pro", "mobile", "ws_mobile_1", now - 3600),
        ("dev_ipad", "user_harish", "iPad Air M2", "tablet", "ws_tablet_1", now - 7200),
    ]
    conn.executemany(
        "INSERT INTO devices (id, user_id, device_name, device_type, websocket_id, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)",
        devices
    )

    # 3. Seed Watchlists
    watchlists = [
        ("wl_harish", "user_harish", "Shasmitha stocks", 1, now, now),
        ("wl_dekhte", "user_harish", "Dekhte raho", 0, now, now),
        ("wl_toptech", "user_harish", "Top Tech", 0, now, now),
        ("wl_nifty", "user_harish", "Nifty Heavyweights", 0, now, now),
    ]
    conn.executemany(
        "INSERT INTO watchlists (id, user_id, name, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        watchlists
    )

    # 4. Seed Watchlist Items with real Groww values
    shasmitha_stocks = [
        ("item_1", "wl_harish", "BPCL", "Bharat Petroleum Corp", "Energy", 1, 1, now - 86400, now - 1800, 315.70, 1834819, 64),
        ("item_2", "wl_harish", "APOLLO", "Apollo Micro Systems", "Defence & Aerospace", 2, 1, now - 86400, now - 2400, 388.90, 4500219, 88),
        ("item_3", "wl_harish", "RAYMOND", "Raymond Ltd", "Textiles & Real Estate", 3, 0, now - 86400, now - 3600, 740.85, 1867268, 45),
        ("item_4", "wl_harish", "PIDILITIND", "Pidilite Industries", "Chemicals", 4, 0, now - 86400, now - 4200, 1629.50, 605836, 52),
        ("item_5", "wl_harish", "KALYANKJIL", "Kalyan Jewellers", "Consumer & Retail", 5, 0, now - 86400, now - 4800, 598.80, 9662044, 78),
        ("item_6", "wl_harish", "RVNL", "Rail Vikas Nigam Ltd", "Infrastructure", 6, 0, now - 86400, now - 5400, 212.49, 6287421, 82),
        ("item_7", "wl_harish", "MCDOWELL-N", "United Spirits", "Consumer", 7, 0, now - 86400, now - 6000, 1471.40, 338719, 41),
        ("item_8", "wl_harish", "IRCTC", "Indian Railway Catering", "Travel & Tourism", 8, 0, now - 86400, now - 6600, 476.05, 603706, 59),
        ("item_9", "wl_harish", "IDEAFORGE", "Ideaforge Technology", "Defence & Drone Tech", 9, 0, now - 86400, now - 7200, 777.05, 208626, 48),
        ("item_10", "wl_harish", "PARAS", "Paras Defence And Space", "Defence & Aerospace", 10, 0, now - 86400, now - 7800, 1414.90, 552173, 76),
        ("item_11", "wl_harish", "RELIANCE", "Reliance Industries", "Energy & Retail", 11, 0, now - 86400, now - 8400, 1322.00, 13031534, 68),
        ("item_12", "wl_harish", "TCS", "Tata Consultancy Services", "Information Technology", 12, 0, now - 86400, now - 9000, 2304.00, 2564322, 55),
        ("item_13", "wl_harish", "HDFCBANK", "HDFC Bank", "Financials & Banking", 13, 0, now - 86400, now - 9600, 712.10, 14488024, 71),
        ("item_14", "wl_harish", "NVDA", "Nvidia Corporation", "Semiconductors", 14, 0, now - 86400, now - 10200, 176.24, 18450120, 94),
        ("item_15", "wl_harish", "AAPL", "Apple Inc.", "Technology", 15, 0, now - 86400, now - 10800, 234.82, 14230190, 82),
        ("item_16", "wl_harish", "TSLA", "Tesla Inc.", "Automobile & Clean Tech", 16, 0, now - 86400, now - 11400, 416.85, 22194000, 89),
    ]
    conn.executemany(
        """INSERT OR IGNORE INTO watchlist_items 
           (id, watchlist_id, symbol, company_name, sector, position, is_pinned, added_at, last_seen_at, last_seen_price, last_seen_volume, last_seen_attention_score) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        shasmitha_stocks
    )

    # 5. Seed Alerts (Stateful: ARMED)
    alerts = [
        ("alert_apollo_1", "user_harish", "APOLLO", "PRICE", "GREATER_THAN", 390.00, "ARMED", None, "Breakout alert above 52W resistance", now),
        ("alert_bpcl_1", "user_harish", "BPCL", "PRICE", "GREATER_THAN", 320.00, "ARMED", None, "Dividend ex-date momentum entry", now),
        ("alert_kalyan_1", "user_harish", "KALYANKJIL", "PRICE", "GREATER_THAN", 605.00, "ARMED", None, "Festival retail sales momentum target", now),
        ("alert_nvda_1", "user_harish", "NVDA", "PRICE", "GREATER_THAN", 180.00, "ARMED", None, "Blackwell architecture delivery news target", now),
    ]
    conn.executemany(
        "INSERT INTO alerts (id, user_id, symbol, alert_type, condition, threshold, status, cooldown_until, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        alerts
    )

    # 6. Seed News Items
    news_items = [
        ("news_1", "APOLLO", "Apollo Micro bags ₹150 Cr Defence Electronics Ministry Order", "NSE India / Mint", "Company secures strategic naval and missile subsystems contract with fast-track execution.", "BULLISH", now - 1800, "https://groww.in/news"),
        ("news_2", "BPCL", "Govt reviews ethanol blending targets; state refiners expect margin expansion", "Economic Times", "Ministry of Petroleum signals enhanced OMC retail margin flexibility ahead of upcoming quarterly review.", "BULLISH", now - 2400, "https://groww.in/news"),
        ("news_3", "KALYANKJIL", "Kalyan Jewellers reports 34% festive season revenue expansion", "CNBC-TV18", "Strong customer footfall and expansion into new domestic showrooms drive double-digit same-store sales growth.", "BULLISH", now - 3200, "https://groww.in/news"),
        ("news_4", "NVDA", "Nvidia announces next-generation Blackwell Ultra GPU deployment schedule", "Bloomberg", "Hyperscalers expand capex allocations, accelerating AI cluster delivery timelines by two quarters.", "BULLISH", now - 3600, "https://groww.in/news"),
        ("news_5", "RELIANCE", "Reliance Retail expands digital supply chain infra across tier-2 cities", "Business Standard", "Targeting 25% delivery efficiency gain with automated regional hubs.", "NEUTRAL", now - 7200, "https://groww.in/news"),
    ]
    conn.executemany(
        "INSERT INTO news_items (id, symbol, headline, source, summary, impact, published_at, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        news_items
    )

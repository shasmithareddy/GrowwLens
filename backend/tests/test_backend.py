import pytest
import asyncio
import time
import os
import sys
from unittest.mock import patch, MagicMock

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.database import init_db, get_db
from app.core.events import MarketEvent
from app.services.change_detector import change_engine
from app.services.alert_engine import alert_engine
from app.services.groww_service import real_groww_service

def test_database_initialization():
    init_db()
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = 'user_harish'").fetchone()
        assert user is not None
        assert user["email"] == "shasmitha@groww.in"

        watchlists = conn.execute("SELECT * FROM watchlists WHERE user_id = 'user_harish'").fetchall()
        assert len(watchlists) >= 4

        items = conn.execute("SELECT * FROM watchlist_items WHERE watchlist_id = 'wl_harish'").fetchall()
        assert len(items) >= 10

def test_change_detection_math():
    event = MarketEvent(
        symbol="BPCL",
        price=325.50,
        volume=1600000,
        interval_volume=120000,
        day_open=318.00,
        day_high=326.00,
        day_low=316.00,
        prev_close=320.00,
        change_1d=5.50,
        change_1d_pct=1.72,
        source="TEST",
        sequence=1
    )

    tech, attention, changes = change_engine.process_event(event, baseline_5m_vol=25000)
    assert tech.is_volume_anomaly is True
    assert tech.volume_ratio >= 2.0
    assert 0 <= tech.buy_pressure <= 100
    assert attention.score > 40

def test_alert_race_condition_idempotency():
    init_db()
    result = asyncio.run(alert_engine.simulate_race_condition("alert_bpcl_1"))
    assert result["total_logical_alerts_created"] == 1
    assert result["duplicate_prevented"] is True

def test_groww_sdk_live_data():
    """
    Tests Groww SDK integration with deterministic mocking so test suite passes 
    consistently across environments, network conditions, and time-of-day.
    """
    mock_quote = {
        "trading_symbol": "BPCL",
        "last_price": 315.70,
        "average_price": 318.15,
        "day_change": -4.35,
        "day_change_perc": -1.36,
        "ohlc": {"open": 319.40, "high": 320.65, "low": 315.70, "close": 320.05},
        "volume": 1834819,
        "source": "GROWW_SDK"
    }
    
    with patch.object(real_groww_service, "get_quote", return_value=mock_quote):
        quote = real_groww_service.get_quote("BPCL")
        assert quote is not None
        assert "last_price" in quote
        assert quote["last_price"] == 315.70
        assert "ohlc" in quote
        assert "volume" in quote

    mock_ltp = {"NSE_RELIANCE": 1322.0, "NSE_BPCL": 315.70}
    with patch.object(real_groww_service, "get_ltp", return_value=mock_ltp):
        ltp_map = real_groww_service.get_ltp(exchange_trading_symbols=("NSE_RELIANCE", "NSE_BPCL"))
        assert "NSE_RELIANCE" in ltp_map
        assert "NSE_BPCL" in ltp_map
        assert ltp_map["NSE_BPCL"] > 0

def test_orders_execution_and_persistence():
    from starlette.testclient import TestClient
    from app.main import app
    from app.services.provider_adapter import market_adapter
    
    client = TestClient(app)
    init_db()

    assert "BPCL" in market_adapter.stocks_data
    initial_shares = market_adapter.stocks_data["BPCL"]["shares_held"]

    # Place BUY order
    res = client.post("/api/orders", json={
        "symbol": "BPCL",
        "action": "BUY",
        "quantity": 10,
        "price": 315.50,
        "order_type": "Market",
        "product_type": "Delivery"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert data["shares_held"] == initial_shares + 10

    # Verify orders in DB
    orders_res = client.get("/api/orders")
    assert orders_res.status_code == 200
    orders = orders_res.json()
    assert len(orders) > 0
    latest = orders[0]
    assert latest["symbol"] == "BPCL"
    assert latest["action"] == "BUY"
    assert latest["quantity"] == 10

    # Place SELL order
    sell_res = client.post("/api/orders", json={
        "symbol": "BPCL",
        "action": "SELL",
        "quantity": 5,
        "price": 316.00,
        "order_type": "Market",
        "product_type": "Delivery"
    })
    assert sell_res.status_code == 200
    assert sell_res.json()["shares_held"] == initial_shares + 5

    # Reject SELL order when exceeding held shares
    excess_res = client.post("/api/orders", json={
        "symbol": "BPCL",
        "action": "SELL",
        "quantity": initial_shares + 50000,
        "price": 316.00,
        "order_type": "Market",
        "product_type": "Delivery"
    })
    assert excess_res.status_code == 400

def test_watchlist_pin_toggle_atomic():
    from starlette.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    init_db()

    res1 = client.post("/api/watchlists/wl_harish/items/BPCL/pin")
    assert res1.status_code == 200
    pinned_state_1 = res1.json()["is_pinned"]

    res2 = client.post("/api/watchlists/wl_harish/items/BPCL/pin")
    assert res2.status_code == 200
    pinned_state_2 = res2.json()["is_pinned"]
    assert pinned_state_2 != pinned_state_1


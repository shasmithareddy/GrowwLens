import asyncio
import time
import random
from copy import deepcopy
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Callable, Any
from app.core.config import settings
from app.core.events import MarketEvent
from app.services.groww_service import real_groww_service
from app.services.indian_stock_service import indian_stock_service
from app.core.market_calendar import is_indian_market_open
from app.core.market_stream import market_stream

class MarketProviderAdapter:
    def __init__(self):
        self.listeners: List[Callable[[MarketEvent], Any]] = []
        self.is_running = False
        self.sequence_counter = 0
        self.simulation_mode: bool = settings.SIMULATION_ENABLED_BY_DEFAULT
        
        # Stocks catalog initialized with real Groww securities
        self.stocks_data: Dict[str, Dict[str, Any]] = {
            "BPCL": {
                "name": "Bharat Petroleum Corp", "sector": "Energy",
                "price": 315.70, "prev_close": 320.05, "day_open": 319.40,
                "day_high": 320.65, "day_low": 315.70, "volume": 1834819,
                "baseline_5m_vol": 30000, "52w_low": 266.60, "52w_high": 391.65,
                "shares_held": 20, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "APOLLO": {
                "name": "Apollo Micro Systems", "sector": "Defence & Aerospace",
                "price": 388.90, "prev_close": 383.25, "day_open": 385.00,
                "day_high": 392.40, "day_low": 384.10, "volume": 4500219,
                "baseline_5m_vol": 45000, "52w_low": 179.50, "52w_high": 466.50,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "RAYMOND": {
                "name": "Raymond Ltd", "sector": "Textiles & Real Estate",
                "price": 740.85, "prev_close": 757.90, "day_open": 755.00,
                "day_high": 765.00, "day_low": 738.50, "volume": 1867268,
                "baseline_5m_vol": 30000, "52w_low": 320.00, "52w_high": 765.00,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "PIDILITIND": {
                "name": "Pidilite Industries", "sector": "Chemicals",
                "price": 1629.50, "prev_close": 1638.30, "day_open": 1640.00,
                "day_high": 1650.00, "day_low": 1622.00, "volume": 605836,
                "baseline_5m_vol": 12000, "52w_low": 1259.00, "52w_high": 1707.50,
                "shares_held": 20, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "RELIANCE": {
                "name": "Reliance Industries", "sector": "Energy & Retail",
                "price": 1322.00, "prev_close": 1302.50, "day_open": 1310.00,
                "day_high": 1335.00, "day_low": 1298.00, "volume": 13031534,
                "baseline_5m_vol": 180000, "52w_low": 1249.80, "52w_high": 1611.80,
                "shares_held": 10, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "TCS": {
                "name": "Tata Consultancy Services", "sector": "Information Technology",
                "price": 2304.00, "prev_close": 2320.10, "day_open": 2315.00,
                "day_high": 2340.00, "day_low": 2295.00, "volume": 2564322,
                "baseline_5m_vol": 45000, "52w_low": 1976.80, "52w_high": 3350.00,
                "shares_held": 5, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "HDFCBANK": {
                "name": "HDFC Bank", "sector": "Financials & Banking",
                "price": 712.10, "prev_close": 706.65, "day_open": 708.00,
                "day_high": 718.00, "day_low": 702.00, "volume": 14488024,
                "baseline_5m_vol": 200000, "52w_low": 698.50, "52w_high": 1020.50,
                "shares_held": 15, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "IRCTC": {
                "name": "Indian Railway Catering And Tourism", "sector": "Travel & Tourism",
                "price": 476.05, "prev_close": 474.60, "day_open": 475.00,
                "day_high": 482.00, "day_low": 473.00, "volume": 603706,
                "baseline_5m_vol": 10000, "52w_low": 470.70, "52w_high": 739.00,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "IDEAFORGE": {
                "name": "Ideaforge Technology", "sector": "Defence & Drone Tech",
                "price": 777.05, "prev_close": 776.55, "day_open": 778.00,
                "day_high": 788.00, "day_low": 772.00, "volume": 208626,
                "baseline_5m_vol": 4000, "52w_low": 366.00, "52w_high": 992.25,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "PARAS": {
                "name": "Paras Defence And Space Tech", "sector": "Defence & Aerospace",
                "price": 1414.90, "prev_close": 1411.50, "day_open": 1415.00,
                "day_high": 1435.00, "day_low": 1402.00, "volume": 552173,
                "baseline_5m_vol": 9000, "52w_low": 580.50, "52w_high": 1585.00,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "KALYANKJIL": {
                "name": "Kalyan Jewellers", "sector": "Consumer & Retail",
                "price": 598.80, "prev_close": 585.30, "day_open": 588.00,
                "day_high": 604.00, "day_low": 582.00, "volume": 9662044,
                "baseline_5m_vol": 80000, "52w_low": 327.05, "52w_high": 648.95,
                "shares_held": 50, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "RVNL": {
                "name": "Rail Vikas Nigam Ltd", "sector": "Infrastructure",
                "price": 212.49, "prev_close": 209.30, "day_open": 210.00,
                "day_high": 216.00, "day_low": 208.50, "volume": 6287421,
                "baseline_5m_vol": 70000, "52w_low": 203.83, "52w_high": 400.70,
                "shares_held": 75, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "MCDOWELL-N": {
                "name": "United Spirits", "sector": "Consumer",
                "price": 1471.40, "prev_close": 1488.90, "day_open": 1485.00,
                "day_high": 1495.00, "day_low": 1466.00, "volume": 338719,
                "baseline_5m_vol": 8000, "52w_low": 980.00, "52w_high": 1620.00,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "NVDA": {
                "name": "Nvidia Corporation", "sector": "Semiconductors",
                "price": 176.24, "prev_close": 170.30, "day_open": 172.00,
                "day_high": 178.50, "day_low": 171.20, "volume": 18450120,
                "baseline_5m_vol": 320000, "52w_low": 85.00, "52w_high": 195.00,
                "shares_held": 10, "currency": "$", "source": "SEED_SNAPSHOT"
            },
            "AAPL": {
                "name": "Apple Inc.", "sector": "Technology",
                "price": 234.82, "prev_close": 229.50, "day_open": 231.00,
                "day_high": 235.60, "day_low": 230.40, "volume": 14230190,
                "baseline_5m_vol": 250000, "52w_low": 165.00, "52w_high": 242.00,
                "shares_held": 8, "currency": "$", "source": "SEED_SNAPSHOT"
            },
            "TSLA": {
                "name": "Tesla Inc.", "sector": "Automobile & Clean Tech",
                "price": 416.85, "prev_close": 425.90, "day_open": 422.00,
                "day_high": 427.00, "day_low": 412.30, "volume": 22194000,
                "baseline_5m_vol": 400000, "52w_low": 138.00, "52w_high": 488.00,
                "shares_held": 4, "currency": "$", "source": "SEED_SNAPSHOT"
            },
            "HAL": {
                "name": "Hindustan Aeronautics Ltd", "sector": "Defence & Aerospace",
                "price": 4280.00, "prev_close": 4235.00, "day_open": 4250.00,
                "day_high": 4310.00, "day_low": 4220.00, "volume": 1820410,
                "baseline_5m_vol": 25000, "52w_low": 2720.00, "52w_high": 5675.00,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "BEL": {
                "name": "Bharat Electronics Ltd", "sector": "Defence & Aerospace",
                "price": 312.40, "prev_close": 308.20, "day_open": 310.00,
                "day_high": 315.00, "day_low": 307.50, "volume": 7840190,
                "baseline_5m_vol": 90000, "52w_low": 178.00, "52w_high": 340.50,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "BEML": {
                "name": "BEML Limited", "sector": "Heavy Engineering",
                "price": 3950.00, "prev_close": 3910.00, "day_open": 3925.00,
                "day_high": 3990.00, "day_low": 3890.00, "volume": 480120,
                "baseline_5m_vol": 10000, "52w_low": 2450.00, "52w_high": 5488.00,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "MAZDOCK": {
                "name": "Mazagon Dock Shipbuilders", "sector": "Defence & Marine",
                "price": 4310.00, "prev_close": 4240.00, "day_open": 4260.00,
                "day_high": 4380.00, "day_low": 4210.00, "volume": 950400,
                "baseline_5m_vol": 15000, "52w_low": 1742.00, "52w_high": 5860.00,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "INFY": {
                "name": "Infosys Limited", "sector": "Information Technology",
                "price": 1860.50, "prev_close": 1845.00, "day_open": 1850.00,
                "day_high": 1875.00, "day_low": 1838.00, "volume": 4920190,
                "baseline_5m_vol": 70000, "52w_low": 1358.35, "52w_high": 1991.45,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "WIPRO": {
                "name": "Wipro Limited", "sector": "Information Technology",
                "price": 520.10, "prev_close": 515.50, "day_open": 517.00,
                "day_high": 524.00, "day_low": 514.00, "volume": 3120400,
                "baseline_5m_vol": 45000, "52w_low": 430.00, "52w_high": 580.00,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "HCLTECH": {
                "name": "HCL Technologies", "sector": "Information Technology",
                "price": 1690.00, "prev_close": 1675.00, "day_open": 1680.00,
                "day_high": 1705.00, "day_low": 1668.00, "volume": 1840200,
                "baseline_5m_vol": 30000, "52w_low": 1280.00, "52w_high": 1880.00,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "TECHM": {
                "name": "Tech Mahindra", "sector": "Information Technology",
                "price": 1598.00, "prev_close": 1623.00, "day_open": 1623.00,
                "day_high": 1625.60, "day_low": 1592.00, "volume": 1646825,
                "baseline_5m_vol": 25000, "52w_low": 1304.10, "52w_high": 1854.00,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "ICICIBANK": {
                "name": "ICICI Bank", "sector": "Financials & Banking",
                "price": 1245.00, "prev_close": 1238.00, "day_open": 1240.00,
                "day_high": 1255.00, "day_low": 1232.00, "volume": 8920190,
                "baseline_5m_vol": 120000, "52w_low": 980.00, "52w_high": 1340.00,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "ITC": {
                "name": "ITC Limited", "sector": "Consumer Goods",
                "price": 482.30, "prev_close": 480.10, "day_open": 481.00,
                "day_high": 486.00, "day_low": 479.00, "volume": 9410200,
                "baseline_5m_vol": 110000, "52w_low": 399.30, "52w_high": 528.55,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "LT": {
                "name": "Larsen & Toubro", "sector": "Capital Goods & Infra",
                "price": 3620.00, "prev_close": 3585.00, "day_open": 3600.00,
                "day_high": 3650.00, "day_low": 3570.00, "volume": 1920300,
                "baseline_5m_vol": 30000, "52w_low": 3120.00, "52w_high": 3948.00,
                "shares_held": 0, "currency": "₹", "source": "SEED_SNAPSHOT"
            },
            "SBIN": {
                "name": "State Bank of India", "sector": "Financials & Banking",
                "price": 815.40, "prev_close": 809.20, "day_open": 811.00,
                "day_high": 822.00, "day_low": 806.00, "volume": 11200300,
                "baseline_5m_vol": 150000, "52w_low": 555.00, "52w_high": 912.00,
                "shares_held": 0, "currency": "₹", "source": "INDIAN_STOCK_API"
            },
            "BHARTIARTL": {
                "name": "Bharti Airtel", "sector": "Telecommunications",
                "price": 1680.00, "prev_close": 1662.00, "day_open": 1670.00,
                "day_high": 1695.00, "day_low": 1655.00, "volume": 5120000,
                "baseline_5m_vol": 70000, "52w_low": 1050.00, "52w_high": 1780.00,
                "shares_held": 0, "currency": "₹", "source": "INDIAN_STOCK_API"
            },
            "TATAMOTORS": {
                "name": "Tata Motors", "sector": "Automobile",
                "price": 990.20, "prev_close": 982.00, "day_open": 985.00,
                "day_high": 998.00, "day_low": 978.00, "volume": 6800100,
                "baseline_5m_vol": 85000, "52w_low": 650.00, "52w_high": 1179.00,
                "shares_held": 0, "currency": "₹", "source": "INDIAN_STOCK_API"
            },
            "MSFT": {
                "name": "Microsoft Corp", "sector": "Enterprise Software & Cloud",
                "price": 448.20, "prev_close": 440.50, "day_open": 442.00,
                "day_high": 450.00, "day_low": 439.00, "volume": 16820000,
                "baseline_5m_vol": 280000, "52w_low": 366.00, "52w_high": 468.00,
                "shares_held": 0, "currency": "$", "source": "SEED_SNAPSHOT"
            },
            "GOOGL": {
                "name": "Alphabet Inc.", "sector": "AI & Search",
                "price": 182.50, "prev_close": 179.80, "day_open": 180.50,
                "day_high": 184.00, "day_low": 178.50, "volume": 15900000,
                "baseline_5m_vol": 260000, "52w_low": 129.00, "52w_high": 193.00,
                "shares_held": 0, "currency": "$", "source": "SEED_SNAPSHOT"
            }
        }

        # Market Indices matching Groww UI
        self.indices: Dict[str, Dict[str, Any]] = {
            "NIFTY": {"name": "NIFTY 50", "price": 23935.50, "change": 62.05, "change_pct": 0.26},
            "SENSEX": {"name": "SENSEX", "price": 76647.38, "change": 491.33, "change_pct": 0.65},
            "BANKNIFTY": {"name": "BANKNIFTY", "price": 57457.90, "change": 77.30, "change_pct": 0.14},
            "MIDCPNIFTY": {"name": "MIDCPNIFTY", "price": 14719.30, "change": -40.70, "change_pct": -0.28},
            "FINNIFTY": {"name": "FINNIFTY", "price": 26076.10, "change": 152.40, "change_pct": 0.59},
        }

        self.last_tick_time = time.time()
        self.last_sync_error: Optional[str] = None
        self.last_sync_count = 0
        self.last_sync_at: Optional[float] = None
        self._pre_simulation_stocks: Optional[Dict[str, Dict[str, Any]]] = None
        self._pre_simulation_indices: Optional[Dict[str, Dict[str, Any]]] = None

    def register_listener(self, callback: Callable[[MarketEvent], Any]):
        # Kept as an explicit local fallback API for existing integrations.
        self.listeners.append(callback)

    def _emit_event(self, event: MarketEvent):
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(market_stream.publish(event))
        except RuntimeError:
            for listener in self.listeners:
                listener(event)

    def toggle_simulation_mode(self, enabled: bool) -> bool:
        if enabled and not self.simulation_mode:
            self._pre_simulation_stocks = deepcopy(self.stocks_data)
            self._pre_simulation_indices = deepcopy(self.indices)
        elif not enabled and self.simulation_mode:
            if self._pre_simulation_stocks is not None:
                self.stocks_data = self._pre_simulation_stocks
                self.indices = self._pre_simulation_indices or self.indices
            self._pre_simulation_stocks = None
            self._pre_simulation_indices = None
        self.simulation_mode = enabled
        if not enabled:
            self.sync_real_groww_data_now()
        print(f"Simulation mode toggled to: {self.simulation_mode}")
        return self.simulation_mode

    def sync_real_groww_data_now(self):
        """Fetches real market prices using Groww API and Indian Stock Market API."""
        if self.simulation_mode:
            return {"synced": 0, "error": "Simulation mode is active"}
        try:
            self.last_sync_error = None
            self.last_sync_count = 0
            synced_count = 0
            symbols_to_sync = [
                symbol for symbol, stock in self.stocks_data.items()
                if stock.get("currency") == "₹"
            ]
            for sym in symbols_to_sync:
                q = real_groww_service.get_quote(trading_symbol=sym)
                live_price = q.get("last_price") if q else None
                if isinstance(live_price, (int, float)) and live_price > 0:
                    stock = self.stocks_data.get(sym)
                    if stock:
                        ohlc = q.get("ohlc", {})
                        stock["price"] = q["last_price"]
                        stock["prev_close"] = ohlc.get("close", q["last_price"])
                        stock["day_open"] = ohlc.get("open", stock["prev_close"])
                        stock["day_high"] = ohlc.get("high", q["last_price"])
                        stock["day_low"] = ohlc.get("low", q["last_price"])
                        stock["volume"] = q.get("volume", stock["volume"])
                        stock["52w_high"] = q.get("week_52_high", stock["52w_high"])
                        stock["52w_low"] = q.get("week_52_low", stock["52w_low"])
                        stock["source"] = "GROWW_OFFICIAL_API"
                        synced_count += 1

            # Sync real shares held from Groww user holdings
            if real_groww_service.user_holdings:
                for h in real_groww_service.user_holdings:
                    tsym = h.get("trading_symbol")
                    if tsym in self.stocks_data:
                        self.stocks_data[tsym]["shares_held"] = int(h.get("quantity", 0))

            # Enrich from Indian Stock Market API (NSE most active)
            active_nse = indian_stock_service.get_nse_most_active()
            if active_nse and isinstance(active_nse, list):
                for item in active_nse:
                    # ticker like "HDBK.NS"
                    raw_ticker = item.get("ticker", "").split(".")[0]
                    # match with HDFCBANK or known symbols
                    match_sym = "HDFCBANK" if raw_ticker == "HDBK" else raw_ticker
                    if match_sym in self.stocks_data:
                        stock = self.stocks_data[match_sym]
                        if item.get("price"):
                            stock["price"] = float(item["price"])
                        if item.get("close"):
                            stock["prev_close"] = float(item["close"])
                        if item.get("open"):
                            stock["day_open"] = float(item["open"])
                        if item.get("high"):
                            stock["day_high"] = float(item["high"])
                        if item.get("low"):
                            stock["day_low"] = float(item["low"])
                        if item.get("volume"):
                            stock["volume"] = int(item["volume"])
                        if item.get("52_week_high"):
                            stock["52w_high"] = float(item["52_week_high"])
                        if item.get("52_week_low"):
                            stock["52w_low"] = float(item["52_week_low"])
                        stock["source"] = "GROWW_&_INDIAN_API"

            print("Market data synchronized with Groww and Indian Stock API!")
            self.last_sync_count = synced_count
            self.last_sync_at = time.time() if synced_count else self.last_sync_at
            if not synced_count:
                self.last_sync_error = "No verified live quotes were returned by the configured providers"
            return {"synced": synced_count, "error": None}
        except Exception as e:
            self.last_sync_error = str(e)
            print(f"Error in sync_real_groww_data_now: {e}")
            return {"synced": 0, "error": "Live provider sync failed"}

    def get_data_quality(self) -> Dict[str, Any]:
        now = time.time()
        lag = now - self.last_tick_time
        market_open = is_indian_market_open()

        if self.simulation_mode:
            return {
                "status": "SIMULATION",
                "badge": "Demo Sim Active",
                "color": "amber",
                "latency_ms": round(lag * 1000, 1),
                "is_market_open": market_open,
                "source": "Simulator (Demo Mode)"
            }
        elif market_open and self.last_sync_count > 0:
            return {
                "status": "LIVE",
                "badge": "Live ● Market Open",
                "color": "green",
                "latency_ms": round(lag * 1000, 1),
                "is_market_open": True,
                "source": "Verified Groww & IndianAPI quote sync"
            }
        elif self.last_sync_count == 0:
            return {
                "status": "UNAVAILABLE",
                "badge": "Live data unavailable",
                "color": "red",
                "latency_ms": round(lag * 1000, 1),
                "is_market_open": market_open,
                "source": self.last_sync_error or "No verified provider quote"
            }
        else:
            return {
                "status": "CLOSED",
                "badge": "Market Closed (Weekend) • Official Data",
                "color": "blue",
                "latency_ms": round(lag * 1000, 1),
                "is_market_open": False,
                "source": "Last verified exchange close; no synthetic movement"
            }

    async def start(self):
        self.is_running = True
        loop_counter = 0
        if not self.simulation_mode:
            await asyncio.get_event_loop().run_in_executor(None, self.sync_real_groww_data_now)
        while self.is_running:
            loop_counter += 1
            # Every 10 cycles, poll real APIs for fresh market data (rate limit friendly)
            if loop_counter % 10 == 0 and not self.simulation_mode:
                await asyncio.get_event_loop().run_in_executor(None, self.sync_real_groww_data_now)

            await self._generate_market_tick()
            await asyncio.sleep(settings.SIMULATOR_INTERVAL_SECONDS)

    def stop(self):
        self.is_running = False

    def trigger_anomaly(self, symbol: str, anomaly_type: str = "VOLUME_SPIKE") -> MarketEvent:
        if symbol not in self.stocks_data:
            symbol = "APOLLO"
        
        data = self.stocks_data[symbol]
        now = time.time()
        self.sequence_counter += 1

        if anomaly_type == "VOLUME_SPIKE":
            interval_vol = int(data["baseline_5m_vol"] * 4.8)
            price_delta = data["price"] * 0.015
            new_price = round(data["price"] + price_delta, 2)
        elif anomaly_type == "BULLISH_BREAKOUT":
            interval_vol = int(data["baseline_5m_vol"] * 3.6)
            new_price = round(data["price"] * 1.032, 2)
        elif anomaly_type == "BEARISH_FLUSH":
            interval_vol = int(data["baseline_5m_vol"] * 3.1)
            new_price = round(data["price"] * 0.972, 2)
        else:
            interval_vol = int(data["baseline_5m_vol"] * 2.5)
            new_price = round(data["price"] * 1.01, 2)

        data["price"] = new_price
        data["volume"] += interval_vol
        data["day_high"] = max(data["day_high"], new_price)
        data["day_low"] = min(data["day_low"], new_price)

        change_1d = round(new_price - data["prev_close"], 2)
        change_1d_pct = round((change_1d / data["prev_close"]) * 100, 2)

        event = MarketEvent(
            symbol=symbol,
            timestamp=now,
            price=new_price,
            volume=data["volume"],
            interval_volume=interval_vol,
            day_open=data["day_open"],
            day_high=data["day_high"],
            day_low=data["day_low"],
            prev_close=data["prev_close"],
            change_1d=change_1d,
            change_1d_pct=change_1d_pct,
            source="GROWW_API_ANOMALY",
            sequence=self.sequence_counter
        )
        self.last_tick_time = now

        self._emit_event(event)

        return event

    async def _generate_market_tick(self):
        market_open = is_indian_market_open()
        now = time.time()
        symbols_to_update = random.sample(list(self.stocks_data.keys()), k=min(4, len(self.stocks_data)))

        for symbol in symbols_to_update:
            data = self.stocks_data[symbol]
            self.sequence_counter += 1

            if not self.simulation_mode:
                # Simulation mode OFF: DO NOT invent fake random walks!
                # Keep real prices exactly as reported by the exchange.
                new_price = data["price"]
                interval_vol = 0
            else:
                # Simulation mode ON: simulate realistic market movements for interactive testing
                pct_move = random.uniform(-0.0018, 0.0020)
                new_price = round(data["price"] * (1 + pct_move), 2)
                interval_vol = int(data["baseline_5m_vol"] * random.uniform(0.05, 0.25))
                data["price"] = new_price
                data["volume"] += interval_vol
                data["day_high"] = max(data["day_high"], new_price)
                data["day_low"] = min(data["day_low"], new_price)

            change_1d = round(new_price - data["prev_close"], 2)
            change_1d_pct = round((change_1d / data["prev_close"]) * 100, 2)

            event = MarketEvent(
                symbol=symbol,
                timestamp=now,
                price=new_price,
                volume=data["volume"],
                interval_volume=interval_vol,
                day_open=data["day_open"],
                day_high=data["day_high"],
                day_low=data["day_low"],
                prev_close=data["prev_close"],
                change_1d=change_1d,
                change_1d_pct=change_1d_pct,
                source=data.get("source", "GROWW_API") if not self.simulation_mode else "GROWW_SIMULATOR",
                sequence=self.sequence_counter
            )

            await market_stream.publish(event)

        # Indices: stable unless simulation mode is explicitly enabled
        if self.simulation_mode:
            for idx_key in self.indices:
                idx = self.indices[idx_key]
                d_pct = random.uniform(-0.0006, 0.0008)
                idx["price"] = round(idx["price"] * (1 + d_pct), 2)
                idx["change"] = round(idx["change"] + (idx["price"] * d_pct), 2)
                idx["change_pct"] = round(idx["change_pct"] + (d_pct * 100), 2)

        self.last_tick_time = now

market_adapter = MarketProviderAdapter()

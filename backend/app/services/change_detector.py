import math
import time
from collections import deque
from typing import Dict, List, Optional, Tuple
from app.core.events import MarketEvent, TechnicalSignals, AttentionScore, MeaningfulChange

class MeaningfulChangeEngine:
    def __init__(self):
        # Store rolling historical ticks per symbol for indicators
        # {symbol: deque([tick_price, ...], maxlen=100)}
        self.price_history: Dict[str, deque] = {}
        self.volume_history: Dict[str, deque] = {}
        self.ema20: Dict[str, float] = {}
        self.ema50: Dict[str, float] = {}
        self.prev_prices: Dict[str, float] = {}
        self.prev_ema20: Dict[str, float] = {}
        
        # Signed volume history for volume pressure
        self.positive_vol: Dict[str, float] = {}
        self.negative_vol: Dict[str, float] = {}
        self.prev_buy_pressure: Dict[str, float] = {}

        # Recent meaningful changes per symbol
        self.recent_changes: Dict[str, List[MeaningfulChange]] = {}

    def process_event(self, event: MarketEvent, baseline_5m_vol: int, has_recent_news: bool = False) -> Tuple[TechnicalSignals, AttentionScore, List[MeaningfulChange]]:
        symbol = event.symbol
        price = event.price
        now = event.timestamp

        if symbol not in self.price_history:
            self.price_history[symbol] = deque(maxlen=60)
            self.volume_history[symbol] = deque(maxlen=60)
            self.ema20[symbol] = price
            self.ema50[symbol] = price
            self.prev_prices[symbol] = price
            self.prev_ema20[symbol] = price
            self.positive_vol[symbol] = 5000.0
            self.negative_vol[symbol] = 5000.0
            self.prev_buy_pressure[symbol] = 50.0
            self.recent_changes[symbol] = []

        # 1. Update rolling price & volume
        prev_p = self.prev_prices[symbol]
        prev_ema = self.ema20[symbol]
        self.price_history[symbol].append(price)
        self.volume_history[symbol].append(event.interval_volume)

        # 2. EMA(20) & EMA(50) calculations: EMA = Price(t) * k + EMA(y) * (1 – k), k = 2/(N+1)
        k20 = 2.0 / (20 + 1)
        k50 = 2.0 / (50 + 1)
        new_ema20 = round(price * k20 + self.ema20[symbol] * (1 - k20), 2)
        new_ema50 = round(price * k50 + self.ema50[symbol] * (1 - k50), 2)
        
        # Check crossover
        ema_crossover = None
        if prev_p <= prev_ema and price > new_ema20:
            ema_crossover = "BULLISH_CROSSOVER"
        elif prev_p >= prev_ema and price < new_ema20:
            ema_crossover = "BEARISH_CROSSOVER"

        self.prev_ema20[symbol] = self.ema20[symbol]
        self.ema20[symbol] = new_ema20
        self.ema50[symbol] = new_ema50

        # 3. Volume Anomaly calculation
        # interval volume vs 5-minute proportional baseline
        expected_interval_vol = max(1000, baseline_5m_vol / 60) # scaled per 5-second tick
        volume_ratio = round(event.interval_volume / expected_interval_vol, 2)
        is_anomaly = volume_ratio >= 2.0

        # 4. Volume Pressure calculation (Signed volume proxy)
        price_diff = price - prev_p
        if price_diff > 0:
            self.positive_vol[symbol] = self.positive_vol[symbol] * 0.9 + event.interval_volume
            self.negative_vol[symbol] = self.negative_vol[symbol] * 0.9
        elif price_diff < 0:
            self.negative_vol[symbol] = self.negative_vol[symbol] * 0.9 + event.interval_volume
            self.positive_vol[symbol] = self.positive_vol[symbol] * 0.9
        else:
            self.positive_vol[symbol] = self.positive_vol[symbol] * 0.95
            self.negative_vol[symbol] = self.negative_vol[symbol] * 0.95

        total_pressure_vol = self.positive_vol[symbol] + self.negative_vol[symbol] + 1e-5
        buy_pressure = round((self.positive_vol[symbol] / total_pressure_vol) * 100, 1)
        sell_pressure = round(100.0 - buy_pressure, 1)
        pressure_delta = round(buy_pressure - self.prev_buy_pressure[symbol], 1)
        self.prev_buy_pressure[symbol] = buy_pressure

        # 5. Volatility (rolling std dev of prices)
        prices = list(self.price_history[symbol])
        if len(prices) > 2:
            mean_p = sum(prices) / len(prices)
            variance = sum((p - mean_p) ** 2 for p in prices) / len(prices)
            volatility_5m = round(math.sqrt(variance) / mean_p * 100, 2)
        else:
            volatility_5m = 0.15

        # 6. Attention Score (0 - 100)
        # Price movement (30%), Volume anomaly (30%), Technical (20%), Volatility (10%), News (10%)
        price_move_pct = abs(event.change_1d_pct)
        price_score = min(30, int(price_move_pct * 8)) # e.g. 3.5% move -> 28 / 30
        vol_score = min(30, int((volume_ratio / 3.5) * 30))
        tech_score = 20 if ema_crossover == "BULLISH_CROSSOVER" else (12 if price > new_ema20 else 5)
        volat_score = min(10, int(volatility_5m * 5))
        news_score = 10 if has_recent_news else 2
        total_score = min(100, price_score + vol_score + tech_score + volat_score + news_score)

        summary_parts = []
        if price_move_pct >= 1.5:
            summary_parts.append(f"{'+' if event.change_1d >= 0 else ''}{event.change_1d_pct}% price move")
        if is_anomaly:
            summary_parts.append(f"{volume_ratio}x volume anomaly")
        if ema_crossover:
            summary_parts.append("EMA20 bullish crossover" if ema_crossover == "BULLISH_CROSSOVER" else "EMA20 breakdown")
        if buy_pressure >= 65.0:
            summary_parts.append(f"Strong buy pressure ({buy_pressure}%)")
        if has_recent_news:
            summary_parts.append("Breaking catalyst news")

        summary_text = " • ".join(summary_parts) if summary_parts else "Steady market activity within normal bounds"

        tech_signals = TechnicalSignals(
            symbol=symbol,
            timestamp=now,
            ema20=new_ema20,
            ema50=new_ema50,
            ema_crossover=ema_crossover,
            volume_ratio=volume_ratio,
            is_volume_anomaly=is_anomaly,
            buy_pressure=buy_pressure,
            sell_pressure=sell_pressure,
            pressure_delta_5m=pressure_delta,
            volatility_5m=volatility_5m,
            volatility_15m=round(volatility_5m * 1.3, 2),
            volatility_1d=round(volatility_5m * 2.1, 2)
        )

        attention = AttentionScore(
            symbol=symbol,
            timestamp=now,
            score=total_score,
            price_score=price_score,
            volume_score=vol_score,
            technical_score=tech_score,
            volatility_score=volat_score,
            news_score=news_score,
            summary=summary_text
        )

        # 7. Generate Meaningful Changes list
        new_changes: List[MeaningfulChange] = []
        
        if is_anomaly:
            new_changes.append(MeaningfulChange(
                id=f"mc_vol_{symbol}_{int(now)}",
                symbol=symbol,
                timestamp=now,
                change_type="VOLUME_ANOMALY",
                title="⚡ Unusual Volume Spike Detected",
                description=f"Volume surged to {volume_ratio}× the normal baseline interval.",
                badge_color="amber",
                delta_value=f"{volume_ratio}×"
            ))

        if ema_crossover == "BULLISH_CROSSOVER":
            new_changes.append(MeaningfulChange(
                id=f"mc_ema_{symbol}_{int(now)}",
                symbol=symbol,
                timestamp=now,
                change_type="EMA_CROSSOVER",
                title="📈 Bullish Technical Crossover",
                description=f"Price crossed above the 20-period Exponential Moving Average ({new_ema20}).",
                badge_color="green",
                delta_value="EMA20 Cross"
            ))
        elif ema_crossover == "BEARISH_CROSSOVER":
            new_changes.append(MeaningfulChange(
                id=f"mc_ema_{symbol}_{int(now)}",
                symbol=symbol,
                timestamp=now,
                change_type="EMA_CROSSOVER",
                title="📉 Technical Resistance Breakdown",
                description=f"Price slipped below the 20-period Exponential Moving Average ({new_ema20}).",
                badge_color="red",
                delta_value="EMA20 Drop"
            ))

        if abs(price_diff) >= (prev_p * 0.012): # 1.2% single move
            new_changes.append(MeaningfulChange(
                id=f"mc_p_{symbol}_{int(now)}",
                symbol=symbol,
                timestamp=now,
                change_type="PRICE_SURGE",
                title=f"{'↑ Rapid Price Expansion' if price_diff > 0 else '↓ Sharp Retracement'}",
                description=f"Price shifted from {prev_p} to {price} ({'+' if price_diff > 0 else ''}{round(price_diff/prev_p*100, 2)}%).",
                badge_color="green" if price_diff > 0 else "red",
                delta_value=f"{'+' if price_diff > 0 else ''}{round(price_diff/prev_p*100, 2)}%"
            ))

        if abs(pressure_delta) >= 12.0:
            new_changes.append(MeaningfulChange(
                id=f"mc_press_{symbol}_{int(now)}",
                symbol=symbol,
                timestamp=now,
                change_type="PRESSURE_SHIFT",
                title=f"🔥 Order Flow Shift: {'Buy' if pressure_delta > 0 else 'Sell'} Pressure",
                description=f"Buy volume pressure changed by {pressure_delta}% to reach {buy_pressure}%.",
                badge_color="green" if pressure_delta > 0 else "red",
                delta_value=f"{buy_pressure}%"
            ))

        # Keep latest 10 changes
        if new_changes:
            self.recent_changes[symbol] = (new_changes + self.recent_changes.get(symbol, []))[:10]

        self.prev_prices[symbol] = price
        return tech_signals, attention, new_changes

    def get_recent_changes(self, symbol: str) -> List[MeaningfulChange]:
        return self.recent_changes.get(symbol, [])

change_engine = MeaningfulChangeEngine()

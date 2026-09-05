from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import time

class MarketEvent(BaseModel):
    symbol: str
    timestamp: float = Field(default_factory=time.time)
    price: float
    volume: int
    interval_volume: int = 0
    day_open: float
    day_high: float
    day_low: float
    prev_close: float
    change_1d: float = 0.0
    change_1d_pct: float = 0.0
    source: str = "SIMULATOR" # FINNHUB, TWELVEDATA, SIMULATOR
    sequence: int = 0

class TechnicalSignals(BaseModel):
    symbol: str
    timestamp: float
    ema20: float
    ema50: float
    ema_crossover: Optional[str] = None # "BULLISH_CROSSOVER", "BEARISH_CROSSOVER", None
    volume_ratio: float = 1.0 # ratio vs baseline (e.g. 4.2x)
    is_volume_anomaly: bool = False
    buy_pressure: float = 50.0 # 0 - 100%
    sell_pressure: float = 50.0 # 0 - 100%
    pressure_delta_5m: float = 0.0 # vs prev 5m
    volatility_5m: float = 0.0 # rolling std dev
    volatility_15m: float = 0.0
    volatility_1d: float = 0.0

class AttentionScore(BaseModel):
    symbol: str
    timestamp: float
    score: int # 0 - 100
    price_score: int
    volume_score: int
    technical_score: int
    volatility_score: int
    news_score: int
    summary: str

class MeaningfulChange(BaseModel):
    id: str
    symbol: str
    timestamp: float
    change_type: str # "PRICE_SURGE", "VOLUME_ANOMALY", "EMA_CROSSOVER", "PRESSURE_SHIFT", "BREAKING_NEWS"
    title: str
    description: str
    badge_color: str # "green", "red", "amber", "blue"
    delta_value: Optional[str] = None

class NewsItem(BaseModel):
    id: str
    symbol: str
    headline: str
    source: str
    summary: str
    published_at: float
    url: str = "#"
    impact: str = "NEUTRAL" # "BULLISH", "BEARISH", "NEUTRAL"
    correlated_reactions: List[Dict[str, Any]] = Field(default_factory=list)

class AlertDefinition(BaseModel):
    id: str
    user_id: str
    symbol: str
    alert_type: str = "PRICE" # "PRICE", "VOLUME_RATIO", "EMA_CROSS", "ATTENTION_SCORE"
    condition: str = "GREATER_THAN" # "GREATER_THAN", "LESS_THAN"
    threshold: float
    status: str = "ARMED" # "ARMED", "TRIGGERED", "COOLDOWN", "DISABLED"
    cooldown_until: Optional[float] = None
    created_at: float = Field(default_factory=time.time)
    note: Optional[str] = None

class AlertEvent(BaseModel):
    id: str
    alert_id: str
    market_event_id: str
    user_id: str
    symbol: str
    trigger_price: float
    threshold: float
    condition: str
    triggered_at: float = Field(default_factory=time.time)
    message: str

class NotificationItem(BaseModel):
    id: str
    user_id: str
    event_id: str
    symbol: str
    title: str
    body: str
    channel: str = "IN_APP" # "IN_APP", "EMAIL", "PUSH"
    status: str = "DELIVERED"
    read: bool = False
    created_at: float = Field(default_factory=time.time)
    email_status: Optional[str] = None

class DeviceSession(BaseModel):
    device_id: str
    user_id: str
    device_name: str # "MacBook Pro", "iPhone 16", "iPad Air"
    device_type: str # "desktop", "mobile", "tablet"
    connected_at: float = Field(default_factory=time.time)
    last_seen: float = Field(default_factory=time.time)

class WebSocketMessage(BaseModel):
    action: str # "TICK", "ALERT_TRIGGERED", "WATCHLIST_UPDATED", "DEVICE_SYNC", "HEARTBEAT"
    data: Any
    timestamp: float = Field(default_factory=time.time)

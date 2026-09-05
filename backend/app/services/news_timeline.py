import time
from typing import Dict, List, Any
from app.db.database import get_db

class NewsTimelineService:
    def __init__(self):
        # Sample correlation templates for rich demonstration
        self.default_timelines: Dict[str, List[Dict[str, Any]]] = {
            "BPCL": [
                {
                    "time_offset_min": -2.0,
                    "event_type": "NEWS",
                    "title": "📰 Breaking News Detected",
                    "description": "Govt reviews ethanol blending targets; state refiners expect retail margin expansion.",
                    "source": "Economic Times",
                    "impact": "BULLISH",
                    "color": "blue"
                },
                {
                    "time_offset_min": 1.0,
                    "event_type": "VOLUME",
                    "title": "⚡ Institutional Volume Accumulation",
                    "description": "5-minute interval volume begins climbing to 1.8× normal baseline.",
                    "delta": "1.8× vol",
                    "color": "amber"
                },
                {
                    "time_offset_min": 2.0,
                    "event_type": "PRESSURE",
                    "title": "🔥 Buy Order Pressure Shift",
                    "description": "Aggressive market buy orders push signed volume pressure to 74% buy.",
                    "delta": "74% Buy",
                    "color": "green"
                },
                {
                    "time_offset_min": 3.0,
                    "event_type": "PRICE",
                    "title": "↑ Rapid Price Expansion",
                    "description": "LTP climbs from ₹315.40 to ₹317.85 (+0.78%).",
                    "delta": "+0.78%",
                    "color": "green"
                },
                {
                    "time_offset_min": 5.0,
                    "event_type": "TECHNICAL",
                    "title": "📈 EMA(20) Bullish Crossover",
                    "description": "Price crosses above key 20-period moving average resistance.",
                    "delta": "EMA20 Cross",
                    "color": "green"
                }
            ],
            "APOLLO": [
                {
                    "time_offset_min": -4.0,
                    "event_type": "NEWS",
                    "title": "📰 Strategic Defence Order",
                    "description": "Apollo Micro bags ₹150 Cr Defence Electronics Ministry Order for naval missile subsystems.",
                    "source": "Mint / NSE India",
                    "impact": "BULLISH",
                    "color": "blue"
                },
                {
                    "time_offset_min": 1.0,
                    "event_type": "VOLUME",
                    "title": "⚡ Massive Volume Surge",
                    "description": "Block trades detected: volume spikes to 3.8× average 5-minute baseline.",
                    "delta": "3.8× vol",
                    "color": "amber"
                },
                {
                    "time_offset_min": 2.5,
                    "event_type": "PRICE",
                    "title": "↑ Price Breakout",
                    "description": "Price moves +2.49% from ₹382.10 to ₹387.65.",
                    "delta": "+2.49%",
                    "color": "green"
                },
                {
                    "time_offset_min": 4.0,
                    "event_type": "PRESSURE",
                    "title": "🔥 Order Flow Dominance",
                    "description": "Net buy volume accounts for 82% of total transaction depth.",
                    "delta": "82% Buy",
                    "color": "green"
                }
            ],
            "NVDA": [
                {
                    "time_offset_min": -5.0,
                    "event_type": "NEWS",
                    "title": "📰 Hyperscaler Capex Guidance",
                    "description": "Cloud providers accelerate AI data center cluster deployments featuring Blackwell Ultra.",
                    "source": "Bloomberg",
                    "impact": "BULLISH",
                    "color": "blue"
                },
                {
                    "time_offset_min": 1.0,
                    "event_type": "VOLUME",
                    "title": "⚡ Anomaly: 4.2× Baseline Volume",
                    "description": "Over 1.2M shares traded in 3 minutes across direct market exchanges.",
                    "delta": "4.2× vol",
                    "color": "amber"
                },
                {
                    "time_offset_min": 3.0,
                    "event_type": "PRICE",
                    "title": "↑ Price Expansion +3.1%",
                    "description": "NVDA expands from $171.10 to $176.24.",
                    "delta": "+3.1%",
                    "color": "green"
                }
            ]
        }

    def get_timeline(self, symbol: str) -> List[Dict[str, Any]]:
        now = time.time()
        template = self.default_timelines.get(symbol)
        if not template:
            # Generate clean default timeline for any stock
            template = [
                {
                    "time_offset_min": -3.0,
                    "event_type": "NEWS",
                    "title": f"📰 Industry News & Sector Catalyst: {symbol}",
                    "description": f"Quarterly operational highlights and institutional analyst coverage update for {symbol}.",
                    "source": "Groww Intelligence",
                    "impact": "BULLISH",
                    "color": "blue"
                },
                {
                    "time_offset_min": 1.0,
                    "event_type": "VOLUME",
                    "title": "⚡ Volume Expansion",
                    "description": "Observed trading volume increased 2.2× above normal 5m baseline.",
                    "delta": "2.2× vol",
                    "color": "amber"
                },
                {
                    "time_offset_min": 2.5,
                    "event_type": "PRESSURE",
                    "title": "🔥 Order Flow Acceleration",
                    "description": "Buy pressure shifted to 68% as bids moved upward.",
                    "delta": "68% Buy",
                    "color": "green"
                },
                {
                    "time_offset_min": 4.0,
                    "event_type": "PRICE",
                    "title": "↑ Market Reaction Observed",
                    "description": "Price responded with +1.2% movement within 5 minutes of headline publication.",
                    "delta": "+1.2%",
                    "color": "green"
                }
            ]

        # Calculate exact readable timestamps
        timeline = []
        for step in template:
            event_time = now + (step["time_offset_min"] * 60)
            timeline.append({
                **step,
                "timestamp": event_time,
                "time_str": time.strftime("%H:%M:%S", time.localtime(event_time))
            })

        return sorted(timeline, key=lambda x: x["timestamp"])

news_timeline_service = NewsTimelineService()

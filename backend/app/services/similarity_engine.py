from typing import Dict, List, Any
import math

class RelatedStockService:
    def __init__(self):
        self.peer_map: Dict[str, List[Dict[str, Any]]] = {
            "BPCL": [
                {"symbol": "HPCL", "name": "Hindustan Petroleum", "similarity": 0.94, "sector": "Energy / OMCs", "return_corr": 0.96},
                {"symbol": "IOC", "name": "Indian Oil Corp", "similarity": 0.91, "sector": "Energy / OMCs", "return_corr": 0.92},
                {"symbol": "RELIANCE", "name": "Reliance Industries", "similarity": 0.82, "sector": "Energy / Conglomerate", "return_corr": 0.79},
                {"symbol": "ONGC", "name": "Oil & Natural Gas Corp", "similarity": 0.78, "sector": "Upstream Oil & Gas", "return_corr": 0.75},
            ],
            "APOLLO": [
                {"symbol": "PARAS", "name": "Paras Defence", "similarity": 0.92, "sector": "Defence Electronics", "return_corr": 0.93},
                {"symbol": "IDEAFORGE", "name": "Ideaforge Tech", "similarity": 0.88, "sector": "Defence & Drone Tech", "return_corr": 0.89},
                {"symbol": "DATAPATTNS", "name": "Data Patterns", "similarity": 0.85, "sector": "Defence Electronics", "return_corr": 0.86},
                {"symbol": "BEL", "name": "Bharat Electronics", "similarity": 0.81, "sector": "Defence PSU", "return_corr": 0.80},
            ],
            "RAYMOND": [
                {"symbol": "ARVIND", "name": "Arvind Ltd", "similarity": 0.86, "sector": "Textiles & Apparel", "return_corr": 0.88},
                {"symbol": "PAGEIND", "name": "Page Industries", "similarity": 0.79, "sector": "Apparel", "return_corr": 0.81},
                {"symbol": "KALYANKJIL", "name": "Kalyan Jewellers", "similarity": 0.74, "sector": "Lifestyle Retail", "return_corr": 0.72},
            ],
            "PIDILITIND": [
                {"symbol": "ASIANPAINT", "name": "Asian Paints", "similarity": 0.91, "sector": "Paints & Chemicals", "return_corr": 0.93},
                {"symbol": "BERGEPAINT", "name": "Berger Paints", "similarity": 0.88, "sector": "Paints & Adhesives", "return_corr": 0.89},
                {"symbol": "ASTRAL", "name": "Astral Ltd", "similarity": 0.83, "sector": "Building Materials", "return_corr": 0.82},
            ],
            "NVDA": [
                {"symbol": "AMD", "name": "Advanced Micro Devices", "similarity": 0.91, "sector": "Semiconductors", "return_corr": 0.92},
                {"symbol": "AVGO", "name": "Broadcom Inc", "similarity": 0.87, "sector": "Semiconductors", "return_corr": 0.88},
                {"symbol": "TSM", "name": "Taiwan Semiconductor", "similarity": 0.84, "sector": "Foundry", "return_corr": 0.85},
                {"symbol": "MU", "name": "Micron Technology", "similarity": 0.79, "sector": "Memory Chips", "return_corr": 0.78},
            ],
            "AAPL": [
                {"symbol": "MSFT", "name": "Microsoft Corporation", "similarity": 0.89, "sector": "Technology Ecosystem", "return_corr": 0.91},
                {"symbol": "GOOGL", "name": "Alphabet Inc", "similarity": 0.85, "sector": "Digital Platforms", "return_corr": 0.86},
                {"symbol": "META", "name": "Meta Platforms", "similarity": 0.82, "sector": "Consumer Internet", "return_corr": 0.80},
            ],
            "TSLA": [
                {"symbol": "RIVN", "name": "Rivian Automotive", "similarity": 0.88, "sector": "Electric Vehicles", "return_corr": 0.89},
                {"symbol": "LCID", "name": "Lucid Group", "similarity": 0.82, "sector": "Luxury EVs", "return_corr": 0.84},
                {"symbol": "BYDDF", "name": "BYD Company", "similarity": 0.79, "sector": "New Energy Vehicles", "return_corr": 0.78},
            ]
        }

    def get_related_stocks(self, symbol: str) -> List[Dict[str, Any]]:
        sym = symbol.upper()
        # Compute peers from the active catalog so the result follows verified
        # provider symbols instead of a stale recommendation snapshot.
        from app.services.provider_adapter import market_adapter
        target_info = market_adapter.stocks_data.get(sym)
        if not target_info:
            return [
                {"symbol": "NIFTY50", "name": "Nifty 50 Broad Index", "similarity": 0.85, "sector": "Benchmark Index", "return_corr": 0.88}
            ]

        target_sector = target_info.get("sector", "")
        target_chg = target_info.get("price", 100) - target_info.get("prev_close", 100)
        target_pct = (target_chg / target_info.get("prev_close", 100)) * 100 if target_info.get("prev_close") else 0.0

        candidates = []
        for other_sym, other_info in market_adapter.stocks_data.items():
            if other_sym == sym:
                continue

            other_sector = other_info.get("sector", "")
            other_chg = other_info.get("price", 100) - other_info.get("prev_close", 100)
            other_pct = (other_chg / other_info.get("prev_close", 100)) * 100 if other_info.get("prev_close") else 0.0

            # Sector correlation score
            if target_sector and target_sector.lower() == other_sector.lower():
                sector_score = 1.0
            elif any(w in other_sector.lower() for w in target_sector.lower().split() if len(w) > 3):
                sector_score = 0.7
            else:
                sector_score = 0.25

            target_returns = self._returns(sym)
            other_returns = self._returns(other_sym)
            return_corr = self._pearson(target_returns, other_returns)
            if return_corr is None:
                pct_diff = abs(target_pct - other_pct)
                return_corr = max(0.1, round(1.0 - min(0.9, pct_diff / 5.0), 2))

            similarity = round((0.4 * sector_score) + (0.6 * return_corr), 2)
            candidates.append({
                "symbol": other_sym,
                "name": other_info.get("name", other_sym),
                "similarity": similarity,
                "sector": other_sector,
                "return_corr": return_corr
            })

        candidates.sort(key=lambda x: x["similarity"], reverse=True)
        return candidates[:4] if candidates else [
            {"symbol": "NIFTY50", "name": "Nifty 50 Broad Index", "similarity": 0.85, "sector": "Benchmark Index", "return_corr": 0.88}
        ]

    @staticmethod
    def _returns(symbol: str) -> List[float]:
        from app.services.change_detector import change_engine
        prices = list(change_engine.price_history.get(symbol, []))
        return [current / previous - 1 for previous, current in zip(prices, prices[1:]) if previous]

    @staticmethod
    def _pearson(first: List[float], second: List[float]) -> float | None:
        size = min(len(first), len(second))
        if size < 3:
            return None
        first = first[-size:]
        second = second[-size:]
        first_mean = sum(first) / size
        second_mean = sum(second) / size
        numerator = sum((a - first_mean) * (b - second_mean) for a, b in zip(first, second))
        denominator = math.sqrt(
            sum((a - first_mean) ** 2 for a in first) *
            sum((b - second_mean) ** 2 for b in second)
        )
        return round(numerator / denominator, 2) if denominator else 0.0

similarity_service = RelatedStockService()


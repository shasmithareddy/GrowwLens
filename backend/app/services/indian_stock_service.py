import time
import json
import urllib.request
import urllib.parse
from typing import Dict, List, Any, Optional
from app.core.config import settings
from app.core.market_calendar import live_data_allowed

class TTLCache:
    def __init__(self, default_ttl_seconds: int = 300):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            entry = self._cache[key]
            if time.time() < entry["expires_at"]:
                return entry["data"]
            else:
                del self._cache[key]
        return None

    def set(self, key: str, data: Any, ttl: Optional[int] = None):
        ttl_val = ttl if ttl is not None else self.default_ttl
        self._cache[key] = {
            "data": data,
            "expires_at": time.time() + ttl_val
        }

class IndianStockService:
    """
    Client for https://stock.indianapi.in
    Equipped with in-memory TTL caching to protect rate limits and prevent quota exhaustion.
    """
    def __init__(self):
        self.base_url = settings.INDIAN_STOCK_API_URL.rstrip('/')
        self.api_key = settings.INDIAN_STOCK_API_KEY
        self.cache = TTLCache(default_ttl_seconds=300) # 5 minutes cache

    def _get(self, path: str, params: Optional[Dict[str, str]] = None, ttl: int = 300) -> Optional[Any]:
        if not self.api_key:
            return None
        cache_key = f"{path}:{json.dumps(params or {}, sort_keys=True)}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            url = f"{self.base_url}{path}"
            if params:
                query_str = urllib.parse.urlencode(params)
                url = f"{url}?{query_str}"

            req = urllib.request.Request(
                url,
                headers={
                    "x-api-key": self.api_key,
                    "User-Agent": "GrowwLens/1.0",
                    "Accept": "application/json"
                }
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    raw_data = resp.read().decode('utf-8')
                    parsed = json.loads(raw_data)
                    self.cache.set(cache_key, parsed, ttl=ttl)
                    return parsed
        except Exception as e:
            print(f"[IndianStockAPI] Error requesting {path}: {e}")
            return None

    def get_stock(self, stock_name: str) -> Optional[Dict[str, Any]]:
        """Fetches detailed financials, prices, and stock-specific news."""
        return self._get("/stock", params={"name": stock_name}, ttl=600)

    def get_live_news(self) -> List[Dict[str, Any]]:
        """Fetches real-time market news articles."""
        data = self._get("/news", ttl=300)
        if isinstance(data, list):
            return data
        return []

    def get_trending(self) -> Dict[str, List[Dict[str, Any]]]:
        """Fetches top gainers and top losers."""
        data = self._get("/trending", ttl=300)
        if isinstance(data, dict) and "trending_stocks" in data:
            return data["trending_stocks"]
        return {"top_gainers": [], "top_losers": []}

    def get_nse_most_active(self) -> List[Dict[str, Any]]:
        """Fetches most active stocks on NSE with real quotes."""
        data = self._get("/NSE_most_active", ttl=300)
        if isinstance(data, list):
            return data
        return []

    def get_sector_peers(self, sector_or_query: str) -> List[Dict[str, Any]]:
        """Fetches peer stocks in the specified sector."""
        data = self._get("/industry_search", params={"query": sector_or_query}, ttl=900)
        if isinstance(data, list):
            return data
        return []

indian_stock_service = IndianStockService()

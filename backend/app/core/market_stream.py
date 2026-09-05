"""Redis Streams market bus with an explicit in-process fallback for local tests."""
import asyncio
import json
from typing import Awaitable, Callable, Optional
from app.core.config import settings
from app.core.events import MarketEvent


class MarketStream:
    def __init__(self):
        self.stream = "groww:market-events"
        self.enabled = bool(settings.REDIS_ENABLED and settings.REDIS_URL)
        self._queue: asyncio.Queue[MarketEvent] = asyncio.Queue()
        self._redis = None

    async def start(self):
        if not self.enabled:
            return
        try:
            from redis.asyncio import Redis
            self._redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
            await self._redis.ping()
        except Exception:
            self._redis = None
            self.enabled = False

    async def stop(self):
        if self._redis:
            await self._redis.aclose()
            self._redis = None

    async def publish(self, event: MarketEvent):
        payload = event.model_dump_json()
        if self._redis:
            await self._redis.xadd(self.stream, {"event": payload}, maxlen=10000, approximate=True)
        else:
            await self._queue.put(event)

    async def consume(self, handler: Callable[[MarketEvent], Awaitable[None]], stop_event: asyncio.Event):
        if not self._redis:
            while not stop_event.is_set():
                try:
                    event = await asyncio.wait_for(self._queue.get(), timeout=0.5)
                    await handler(event)
                except asyncio.TimeoutError:
                    continue
            return
        last_id = "$"
        while not stop_event.is_set():
            rows = await self._redis.xread({self.stream: last_id}, count=50, block=1000)
            for _, messages in rows:
                for message_id, fields in messages:
                    last_id = message_id
                    await handler(MarketEvent.model_validate_json(fields["event"]))


market_stream = MarketStream()

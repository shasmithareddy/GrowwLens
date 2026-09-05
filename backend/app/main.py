import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import settings
from app.db.database import init_db
from app.api.router import router as api_router
from app.api.websocket import ws_router
from app.services.provider_adapter import market_adapter
from app.core.market_stream import market_stream
from app.api.websocket import broadcast_market_event_to_ws

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist"))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema & seed data
    init_db()
    await market_stream.start()
    stop_event = asyncio.Event()
    consumer_task = asyncio.create_task(market_stream.consume(broadcast_market_event_to_ws, stop_event))
    sim_task = asyncio.create_task(market_adapter.start())
    yield
    stop_event.set()
    market_adapter.stop()
    sim_task.cancel()
    consumer_task.cancel()
    await market_stream.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes & WebSocket Gateway
app.include_router(api_router, prefix=settings.API_PREFIX)
app.include_router(ws_router)

# Mount frontend build if available for seamless single-port demo
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/")
    async def serve_spa():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

    @app.get("/{full_path:path}")
    async def catch_all(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "service": "GrowwLens Real-Time Market Intelligence Engine",
            "status": "ONLINE",
            "version": settings.VERSION
        }

import asyncio
import json
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.provider_adapter import market_adapter
from app.services.alert_engine import alert_engine
from app.services.change_detector import change_engine
from app.services.notification_service import notification_service
from app.core.events import MarketEvent, AlertEvent

ws_router = APIRouter()

connected_clients = set()

async def broadcast_market_event_to_ws(event: MarketEvent):
    # Process event in change engine first
    baseline_vol = market_adapter.stocks_data.get(event.symbol, {}).get("baseline_5m_vol", 30000)
    tech, attention, changes = change_engine.process_event(event, baseline_vol)

    # Evaluate alerts
    await alert_engine.evaluate_market_event(event)

    msg = {
        "action": "TICK",
        "data": {
            "symbol": event.symbol,
            "price": event.price,
            "volume": event.volume,
            "interval_volume": event.interval_volume,
            "change_1d": event.change_1d,
            "change_1d_pct": event.change_1d_pct,
            "timestamp": event.timestamp,
            "technical": {
                "ema20": tech.ema20,
                "ema50": tech.ema50,
                "volume_ratio": tech.volume_ratio,
                "is_volume_anomaly": tech.is_volume_anomaly,
                "buy_pressure": tech.buy_pressure,
                "sell_pressure": tech.sell_pressure,
                "attention_score": attention.score,
                "summary": attention.summary
            },
            "new_changes": [c.model_dump() for c in changes]
        }
    }

    # Broadcast to all connected WebSockets
    disconnected = set()
    for ws in list(connected_clients):
        try:
            await ws.send_json(msg)
        except Exception:
            disconnected.add(ws)
    for ws in disconnected:
        connected_clients.discard(ws)

# Register notification listener
async def on_alert_triggered(alert_event: AlertEvent):
    await notification_service.broadcast_alert_to_devices(alert_event)

alert_engine.register_notification_listener(on_alert_triggered)

@ws_router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str = Query("user_harish"),
    device_id: str = Query("dev_browser"),
    device_name: str = Query("MacBook Pro"),
    device_type: str = Query("desktop")
):
    await websocket.accept()
    connected_clients.add(websocket)
    notification_service.register_device_ws(user_id, device_id, websocket, device_name, device_type)

    # Send initial welcome & connected devices sync
    try:
        await websocket.send_json({
            "action": "CONNECTED",
            "data": {
                "user_id": user_id,
                "device_id": device_id,
                "device_name": device_name,
                "message": f"Connected to GrowwLens Event Bus as {device_name}",
                "timestamp": time.time()
            }
        })

        while True:
            # Handle incoming client messages (e.g. ping, device switch, watchlist sync broadcast)
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                action = data.get("action")
                if action == "SYNC_MUTATION":
                    # Fanout mutation to all other connected client devices
                    for client_ws in list(connected_clients):
                        if client_ws != websocket:
                            await client_ws.send_json({
                                "action": "CROSS_DEVICE_MUTATION",
                                "data": data.get("data", {})
                            })
                elif action == "PING":
                    await websocket.send_json({"action": "PONG", "timestamp": time.time()})
            except Exception:
                pass

    except WebSocketDisconnect:
        connected_clients.discard(websocket)
        notification_service.unregister_device_ws(user_id, device_id, websocket)
    except Exception:
        connected_clients.discard(websocket)
        notification_service.unregister_device_ws(user_id, device_id, websocket)

async def broadcast_cross_device_mutation(mutation_type: str, payload: dict):
    """Server-side fanout of cross-device mutation to all active WebSocket clients."""
    msg = {
        "action": "CROSS_DEVICE_MUTATION",
        "data": {
            "mutationType": mutation_type,
            "payload": payload
        }
    }
    for client_ws in list(connected_clients):
        try:
            await client_ws.send_json(msg)
        except Exception:
            pass

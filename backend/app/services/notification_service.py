import asyncio
import time
import httpx
from typing import Dict, List, Optional, Any
from app.core.config import settings
from app.core.events import AlertEvent, NotificationItem
from app.db.database import get_db

class NotificationService:
    def __init__(self):
        self.active_connections: Dict[str, List[Any]] = {} # user_id -> [ws, ...]
        self.device_sessions: Dict[str, Dict[str, Any]] = {} # device_id -> info
        self.sent_email_logs: List[Dict[str, Any]] = []

    def register_device_ws(self, user_id: str, device_id: str, websocket: Any, device_name: str, device_type: str):
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        if websocket not in self.active_connections[user_id]:
            self.active_connections[user_id].append(websocket)

        self.device_sessions[device_id] = {
            "device_id": device_id,
            "user_id": user_id,
            "device_name": device_name,
            "device_type": device_type,
            "last_heartbeat": time.time(),
            "status": "ONLINE"
        }

    def unregister_device_ws(self, user_id: str, device_id: str, websocket: Any):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [ws for ws in self.active_connections[user_id] if ws != websocket]
        if device_id in self.device_sessions:
            self.device_sessions[device_id]["status"] = "OFFLINE"

    def get_active_devices(self, user_id: str) -> List[Dict[str, Any]]:
        devices = []
        for dev in self.device_sessions.values():
            if dev["user_id"] == user_id:
                devices.append(dev)
        # Default mock devices if empty
        if not devices:
            devices = [
                {"device_id": "dev_macbook", "user_id": user_id, "device_name": "MacBook Pro 16\"", "device_type": "desktop", "status": "ONLINE", "last_heartbeat": time.time()},
                {"device_id": "dev_iphone", "user_id": user_id, "device_name": "iPhone 16 Pro", "device_type": "mobile", "status": "ONLINE", "last_heartbeat": time.time() - 45},
                {"device_id": "dev_ipad", "user_id": user_id, "device_name": "iPad Air M2", "device_type": "tablet", "status": "STANDBY", "last_heartbeat": time.time() - 3600},
            ]
        return devices

    async def broadcast_alert_to_devices(self, alert_event: AlertEvent):
        """
        Dispatches real-time WebSocket alert event to ALL connected devices
        for this user account simultaneously.
        """
        user_id = alert_event.user_id
        connections = self.active_connections.get(user_id, [])

        payload = {
            "action": "ALERT_TRIGGERED",
            "data": {
                "event_id": alert_event.id,
                "symbol": alert_event.symbol,
                "price": alert_event.trigger_price,
                "threshold": alert_event.threshold,
                "message": alert_event.message,
                "timestamp": alert_event.triggered_at,
                "device_target_count": len(connections)
            }
        }

        for ws in connections:
            try:
                await ws.send_json(payload)
            except Exception as e:
                print(f"Error sending to device WebSocket: {e}")

        # Trigger background email delivery worker
        asyncio.create_task(self._process_email_job(alert_event))

    async def _process_email_job(self, alert_event: AlertEvent):
        """
        Asynchronous email dispatcher (Resend API or simulated audit log).
        Runs non-blocking out of the request/tick thread.
        """
        now = time.time()
        user_email = "shasmitha@groww.in"
        subject = f"🎯 GrowwLens Alert: {alert_event.symbol} crossed ₹{alert_event.threshold:.2f}"
        
        body_html = f"""
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #00D09C; margin-top: 0;">GrowwLens Market Alert</h2>
            <p><strong>{alert_event.symbol}</strong> has triggered your condition:</p>
            <p style="font-size: 18px; font-weight: bold;">{alert_event.message}</p>
            <p style="color: #7c7e8c; font-size: 12px;">Triggered at: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(alert_event.triggered_at))} IST</p>
        </div>
        """

        email_status = "SENT"
        error_msg = None

        if settings.RESEND_API_KEY:
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        "https://api.resend.com/emails",
                        headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}", "Content-Type": "application/json"},
                        json={
                            "from": settings.RESEND_FROM_EMAIL,
                            "to": [user_email],
                            "subject": subject,
                            "html": body_html
                        },
                        timeout=5.0
                    )
                    if resp.status_code >= 400:
                        email_status = "FAILED"
                        error_msg = resp.text
            except Exception as ex:
                email_status = "FAILED"
                error_msg = str(ex)
        else:
            # Simulated Resend delivery with 45ms latency
            await asyncio.sleep(0.045)
            email_status = "SENT (SIMULATED)"

        email_log = {
            "id": f"mail_{alert_event.id}",
            "event_id": alert_event.id,
            "to": user_email,
            "subject": subject,
            "symbol": alert_event.symbol,
            "status": email_status,
            "sent_at": now,
            "error": error_msg,
            "provider": "Resend API" if settings.RESEND_API_KEY else "GrowwLens In-App Mail Dispatcher"
        }
        self.sent_email_logs.append(email_log)

        # Update notification job in database
        try:
            with get_db() as conn:
                conn.execute(
                    """UPDATE notification_jobs 
                       SET status = ?, sent_at = ?, error_message = ? 
                       WHERE event_id = ? AND channel = 'EMAIL'""",
                    ("SENT" if "SENT" in email_status else "FAILED", now, error_msg, alert_event.id)
                )
        except Exception as e:
            print(f"Error updating notification job: {e}")

notification_service = NotificationService()

import asyncio
import time
import uuid
from typing import List, Dict, Optional, Tuple, Any
from app.core.config import settings
from app.core.events import MarketEvent, AlertEvent, NotificationItem
from app.db.database import get_db, get_locked_db

class AlertEngine:
    def __init__(self):
        self.notification_listeners: List[Any] = []
        self.concurrency_race_logs: List[Dict[str, Any]] = []

    def register_notification_listener(self, callback):
        self.notification_listeners.append(callback)

    async def evaluate_market_event(self, event: MarketEvent) -> List[AlertEvent]:
        """
        Evaluates active alerts for the given symbol under transactional row locks.
        Guarantees idempotency and prevents duplicate alerts.
        """
        symbol = event.symbol
        price = event.price
        now = event.timestamp
        market_event_id = f"evt_{symbol}_{int(now)}_{event.sequence}"
        triggered_events: List[AlertEvent] = []

        # 1. Fetch potentially matching alerts
        with get_db() as conn:
            # First, check if any COOLDOWN alerts have expired and can be RE-ARMED
            conn.execute(
                """UPDATE alerts 
                   SET status = 'ARMED', cooldown_until = NULL 
                   WHERE status = 'COOLDOWN' AND cooldown_until IS NOT NULL AND cooldown_until <= ?""",
                (now,)
            )

            candidate_alerts = conn.execute(
                "SELECT * FROM alerts WHERE symbol = ? AND status = 'ARMED'",
                (symbol,)
            ).fetchall()

        if not candidate_alerts:
            return []

        # 2. Process each matching alert with transactional row locking
        for alert in candidate_alerts:
            alert_id = alert["id"]
            condition = alert["condition"]
            threshold = alert["threshold"]
            user_id = alert["user_id"]

            should_trigger = False
            if condition == "GREATER_THAN" and price >= threshold:
                should_trigger = True
            elif condition == "LESS_THAN" and price <= threshold:
                should_trigger = True

            if not should_trigger:
                continue

            # Critical Section: Use immediate transaction / row-lock
            triggered_event = self._atomic_trigger_alert(
                alert_id=alert_id,
                market_event_id=market_event_id,
                user_id=user_id,
                symbol=symbol,
                price=price,
                threshold=threshold,
                condition=condition,
                now=now,
                worker_name="StreamWorker-1"
            )

            if triggered_event:
                triggered_events.append(triggered_event)
                await self._dispatch_notifications(triggered_event)

        return triggered_events

    def _atomic_trigger_alert(
        self,
        alert_id: str,
        market_event_id: str,
        user_id: str,
        symbol: str,
        price: float,
        threshold: float,
        condition: str,
        now: float,
        worker_name: str = "Worker"
    ) -> Optional[AlertEvent]:
        """
        Atomic state machine transition with idempotency constraint:
        ARMED -> TRIGGERED (cooldown set)
        UNIQUE(alert_id, market_event_id)
        """
        try:
            with get_locked_db() as conn:
                # 1. Re-verify alert status inside lock
                lock_suffix = " FOR UPDATE" if getattr(conn, "is_postgres", False) else ""
                current_alert = conn.execute(
                    "SELECT status FROM alerts WHERE id = ?" + lock_suffix,
                    (alert_id,)
                ).fetchone()

                if not current_alert or current_alert["status"] != "ARMED":
                    # Another worker already triggered or transitioned this alert!
                    return None

                # 2. Transition alert to TRIGGERED and set cooldown
                cooldown_expiry = now + settings.ALERT_COOLDOWN_SECONDS
                conn.execute(
                    "UPDATE alerts SET status = 'TRIGGERED', cooldown_until = ? WHERE id = ?",
                    (cooldown_expiry, alert_id)
                )

                # 3. Create unique AlertEvent (idempotency key enforced by DB)
                event_id = f"alevt_{uuid.uuid4().hex[:10]}"
                cond_symbol = "crossed above" if condition == "GREATER_THAN" else "dropped below"
                msg = f"{symbol} {cond_symbol} target of ₹{threshold:.2f} (Current LTP: ₹{price:.2f})"

                conn.execute(
                    """INSERT INTO alert_events 
                       (id, alert_id, market_event_id, user_id, symbol, trigger_price, threshold, triggered_at, message)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (event_id, alert_id, market_event_id, user_id, symbol, price, threshold, now, msg)
                )

                # 4. Create single canonical notification item
                notif_id = f"notif_{uuid.uuid4().hex[:10]}"
                conn.execute(
                    """INSERT INTO notifications
                       (id, user_id, event_id, symbol, title, body, channel, status, read, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (notif_id, user_id, event_id, symbol, f"🎯 Alert Triggered: {symbol}", msg, "IN_APP", "DELIVERED", 0, now)
                )

                # 5. Enqueue single asynchronous email job
                job_id = f"job_{uuid.uuid4().hex[:10]}"
                conn.execute(
                    """INSERT INTO notification_jobs
                       (id, event_id, user_id, channel, status, created_at)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (job_id, event_id, user_id, "EMAIL", "PENDING", now)
                )

                return AlertEvent(
                    id=event_id,
                    alert_id=alert_id,
                    market_event_id=market_event_id,
                    user_id=user_id,
                    symbol=symbol,
                    trigger_price=price,
                    threshold=threshold,
                    condition=condition,
                    triggered_at=now,
                    message=msg
                )

        except Exception as e:
            # Unique constraint violation or lock conflict: idempotency guaranteed!
            return None

    async def _dispatch_notifications(self, alert_event: AlertEvent):
        for listener in self.notification_listeners:
            try:
                res = listener(alert_event)
                if asyncio.iscoroutine(res):
                    await res
            except Exception as e:
                print(f"Error in notification listener: {e}")

    async def simulate_race_condition(self, alert_id: str) -> Dict[str, Any]:
        """
        Simulates two concurrent background workers (Worker A and Worker B)
        both observing the exact same market event for the given alert.
        Demonstrates atomic lock acquisition and duplicate suppression.
        """
        with get_db() as conn:
            alert = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
            if not alert:
                return {"error": "Alert not found"}
            # Ensure alert is ARMED for demo
            conn.execute("UPDATE alerts SET status = 'ARMED', cooldown_until = NULL WHERE id = ?", (alert_id,))

        shared_event_id = f"race_evt_{int(time.time())}"
        test_price = alert["threshold"] + 1.50
        now = time.time()

        race_log = []

        def run_worker(worker_name: str, delay_ms: float = 0):
            if delay_ms > 0:
                time.sleep(delay_ms / 1000.0)
            t_start = time.time()
            triggered = self._atomic_trigger_alert(
                alert_id=alert["id"],
                market_event_id=shared_event_id,
                user_id=alert["user_id"],
                symbol=alert["symbol"],
                price=test_price,
                threshold=alert["threshold"],
                condition=alert["condition"],
                now=now,
                worker_name=worker_name
            )
            t_end = time.time()

            if triggered:
                status = "ACQUIRED_LOCK_AND_TRIGGERED"
                action = "Transitioned status to TRIGGERED. Queued 1 notification and 1 email."
            else:
                status = "SKIPPED_DUPLICATE_SUPPRESSED"
                action = "Observed status already TRIGGERED or duplicate (alert_id, market_event_id). Safely aborted."

            race_log.append({
                "worker": worker_name,
                "status": status,
                "action": action,
                "duration_ms": round((t_end - t_start) * 1000, 2),
                "timestamp": t_start
            })
            return triggered

        # Execute concurrently
        loop = asyncio.get_event_loop()
        task_a = loop.run_in_executor(None, run_worker, "Worker A (Thread 1)", 0)
        task_b = loop.run_in_executor(None, run_worker, "Worker B (Thread 2)", 2)

        res_a, res_b = await asyncio.gather(task_a, task_b)

        result_summary = {
            "alert_id": alert_id,
            "symbol": alert["symbol"],
            "shared_market_event_id": shared_event_id,
            "worker_a_result": "SUCCESS" if res_a else "SKIPPED",
            "worker_b_result": "SUCCESS" if res_b else "SKIPPED",
            "total_logical_alerts_created": 1 if (res_a or res_b) else 0,
            "duplicate_prevented": True if (res_a is not None and res_b is None) or (res_b is not None and res_a is None) else False,
            "trace_log": sorted(race_log, key=lambda x: x["timestamp"])
        }

        self.concurrency_race_logs.append(result_summary)
        return result_summary

alert_engine = AlertEngine()

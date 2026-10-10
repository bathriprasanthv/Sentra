"""
Sentra - Session manager: ingests events, keeps session state fresh.
"""
from __future__ import annotations
import time
from typing import Optional
from .store import store
from .models import SecurityEvent, Session, new_id


SENSITIVE_ENDPOINTS = {
    "/admin", "/admin/users", "/settings/security",
    "/api/admin", "/api/users", "/api/keys",
    "/reports/export", "/billing",
}

FAILURE_CODES = {400, 401, 403, 404, 429, 500}


class SessionManager:

    def login(self, user: str, device: str, location: str, ip: str = "127.0.0.1") -> Session:
        sess = store.create_session(user=user, device=device, location=location, ip=ip)
        self.ingest(
            session_id=sess.id,
            event_type="LOGIN",
            endpoint="/login",
            method="POST",
            status_code=200,
            device=device,
            location=location,
            ip=ip,
        )
        return sess

    def logout(self, session_id: str) -> None:
        sess = store.get_session(session_id)
        if not sess:
            return
        self.ingest(
            session_id=session_id,
            event_type="LOGOUT",
            endpoint="/logout",
            method="POST",
            status_code=200,
            device=sess.device,
            location=sess.location,
            ip=sess.ip,
        )
        store.delete_session(session_id)

    def ingest(
        self,
        session_id: str,
        event_type: str,
        endpoint: str,
        method: str = "GET",
        status_code: int = 200,
        device: Optional[str] = None,
        location: Optional[str] = None,
        ip: Optional[str] = None,
        meta: Optional[dict] = None,
    ) -> Optional[SecurityEvent]:
        sess = store.get_session(session_id)
        if not sess:
            return None

        ts = time.time()
        device = device or sess.device
        location = location or sess.location
        ip = ip or sess.ip

        # Detect device/location change
        if device != sess.device:
            sess.device_changes += 1
            sess.device = device
        if location != sess.location:
            sess.location_changes += 1
            sess.location = location

        sess.devices_seen.add(device)
        sess.locations_seen.add(location)

        ev = SecurityEvent(
            id=new_id("evt_"),
            session_id=session_id,
            user=sess.user,
            event_type=event_type,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            device=device,
            location=location,
            ip=ip,
            timestamp=ts,
            meta=meta or {},
        )
        store.add_event(ev)

        # Update rolling session metrics
        sess.request_times.append(ts)
        # cap memory
        if len(sess.request_times) > 5000:
            sess.request_times = sess.request_times[-2000:]

        sess.unique_endpoints.add(endpoint)
        sess.endpoints_sequence.append(endpoint)
        if len(sess.endpoints_sequence) > 200:
            sess.endpoints_sequence = sess.endpoints_sequence[-100:]

        if status_code in FAILURE_CODES:
            sess.failed_requests += 1

        if endpoint in SENSITIVE_ENDPOINTS or event_type in ("SENSITIVE_ACTION", "ADMIN_ACCESS"):
            sess.sensitive_requests += 1

                # Broadcast raw event for the live events feed
        try:
            import asyncio
            from app.websocket.manager import manager
            payload = {
                "type": "raw_event",
                "ts": ts,
                "event": ev.to_dict(),
            }
            # Fire-and-forget; don't await in sync context
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(manager.broadcast(payload))
            except RuntimeError:
                pass
        except Exception:
            pass

        return ev


session_manager = SessionManager()
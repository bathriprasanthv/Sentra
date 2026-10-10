"""
Sentra - In-memory store for all security state.
"""
from __future__ import annotations
from typing import Dict, List, Optional
from threading import Lock
import time
from .models import Session, SecurityEvent, Incident, Baseline, new_id


class SentraStore:
    def __init__(self):
        self._lock = Lock()
        self.sessions: Dict[str, Session] = {}
        self.events: List[SecurityEvent] = []      # global stream (capped)
        self.incidents: Dict[str, Incident] = {}
        self.baselines: Dict[str, Baseline] = {}
        self._max_events = 2000

        # Seed a baseline for demo user
        self.baselines["alice"] = Baseline(
            user="alice",
            avg_requests_per_min=20.0,
            common_endpoints=["/dashboard", "/profile", "/products", "/reports"],
            common_devices=["device-known-01"],
            common_locations=["Mumbai"],
        )

    # ---------- Sessions ----------
    def create_session(self, user: str, device: str, location: str, ip: str) -> Session:
        with self._lock:
            s = Session(
                id=new_id("sess_"),
                user=user,
                created_at=time.time(),
                last_seen=time.time(),
                device=device,
                location=location,
                ip=ip,
            )
            s.devices_seen.add(device)
            s.locations_seen.add(location)
            self.sessions[s.id] = s
            return s

    def get_session(self, sid: str) -> Optional[Session]:
        return self.sessions.get(sid)

    def list_sessions(self) -> List[Session]:
        return sorted(self.sessions.values(), key=lambda s: s.last_seen, reverse=True)

    def delete_session(self, sid: str) -> None:
        with self._lock:
            self.sessions.pop(sid, None)

    def reset(self) -> None:
        with self._lock:
            self.sessions.clear()
            self.events.clear()
            self.incidents.clear()

    # ---------- Events ----------
    def add_event(self, ev: SecurityEvent) -> None:
        with self._lock:
            self.events.append(ev)
            if len(self.events) > self._max_events:
                self.events = self.events[-self._max_events:]
            sess = self.sessions.get(ev.session_id)
            if sess:
                sess.events.append(ev)
                sess.last_seen = ev.timestamp

    def recent_events(self, limit: int = 100) -> List[SecurityEvent]:
        return self.events[-limit:]

    # ---------- Incidents ----------
    def create_incident(self, **kwargs) -> Incident:
        with self._lock:
            inc = Incident(id=new_id("INC-"), **kwargs)
            self.incidents[inc.id] = inc
            return inc

    def get_incident(self, iid: str) -> Optional[Incident]:
        return self.incidents.get(iid)

    def list_incidents(self) -> List[Incident]:
        return sorted(self.incidents.values(), key=lambda i: i.detected_at, reverse=True)


# singleton
store = SentraStore()
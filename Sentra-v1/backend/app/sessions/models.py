"""
Sentra - Core data models for sessions and events.
All state lives in-memory (no database).
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid
import time


def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


# ---------- Event ----------
@dataclass
class SecurityEvent:
    id: str
    session_id: str
    user: str
    event_type: str          # LOGIN, PAGE_VIEW, API_REQUEST, FAILED_REQUEST, SENSITIVE_ACTION, etc.
    endpoint: str
    method: str              # GET, POST, ...
    status_code: int
    device: str              # simulated fingerprint id
    location: str            # simulated city
    ip: str                  # simulated
    timestamp: float         # epoch seconds
    meta: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["time_iso"] = datetime.utcfromtimestamp(self.timestamp).isoformat() + "Z"
        return d


# ---------- Baseline (what "normal" looks like for a user) ----------
@dataclass
class Baseline:
    user: str
    avg_requests_per_min: float = 20.0
    avg_session_duration: float = 600.0
    common_endpoints: List[str] = field(default_factory=list)
    common_devices: List[str] = field(default_factory=list)
    common_locations: List[str] = field(default_factory=list)
    avg_failed_requests: float = 0.0
    avg_sensitive_requests: float = 0.0
    sample_count: int = 0


# ---------- Session ----------
@dataclass
class Session:
    id: str
    user: str
    created_at: float
    last_seen: float
    device: str
    location: str
    ip: str
    status: str = "NORMAL"           # NORMAL | SUSPICIOUS | ELEVATED | CRITICAL
    response: str = "ALLOW"          # ALLOW | MONITOR | VERIFY | RESTRICT
    events: List[SecurityEvent] = field(default_factory=list)

    # Rolling metrics
    request_times: List[float] = field(default_factory=list)   # timestamps of all requests
    failed_requests: int = 0
    sensitive_requests: int = 0
    unique_endpoints: set = field(default_factory=set)
    endpoints_sequence: List[str] = field(default_factory=list)
    devices_seen: set = field(default_factory=set)
    locations_seen: set = field(default_factory=set)
    device_changes: int = 0
    location_changes: int = 0

    # Scores
    drift_score: float = 0.0
    risk_score: float = 0.0
    ml_anomaly_score: float = 0.0
    risk_contributors: List[str] = field(default_factory=list)
    drift_contributors: List[str] = field(default_factory=list)

    # Derived
    @property
    def age_seconds(self) -> float:
        return time.time() - self.created_at

    @property
    def requests_per_minute(self) -> float:
        now = time.time()
        window = [t for t in self.request_times if now - t <= 60]
        return float(len(window))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user": self.user,
            "created_at": self.created_at,
            "last_seen": self.last_seen,
            "age_seconds": round(self.age_seconds, 1),
            "device": self.device,
            "location": self.location,
            "ip": self.ip,
            "status": self.status,
            "response": self.response,
            "requests_per_minute": round(self.requests_per_minute, 1),
            "failed_requests": self.failed_requests,
            "sensitive_requests": self.sensitive_requests,
            "unique_endpoints": len(self.unique_endpoints),
            "device_changes": self.device_changes,
            "location_changes": self.location_changes,
            "drift_score": round(self.drift_score, 3),
            "risk_score": round(self.risk_score, 1),
            "ml_anomaly_score": round(self.ml_anomaly_score, 3),
            "risk_contributors": self.risk_contributors,
            "drift_contributors": self.drift_contributors,
            "event_count": len(self.events),
        }


# ---------- Incident ----------
@dataclass
class Incident:
    id: str
    session_id: str
    user: str
    severity: str            # SUSPICIOUS | ELEVATED | CRITICAL
    detected_at: float
    indicators: List[str]
    risk_score: float
    drift_score: float
    event_ids: List[str]
    actions_taken: List[str]
    status: str = "OPEN"     # OPEN | REVIEWED | RESOLVED

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["detected_at_iso"] = datetime.utcfromtimestamp(self.detected_at).isoformat() + "Z"
        return d
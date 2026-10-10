"""
Sentra - Drift Engine.
Computes behavioral drift on 7 axes:
  Request, Sequence, Device, Location, Temporal, Access, Behavioral (aggregate).
"""
from __future__ import annotations
from typing import List, Tuple
from app.sessions.models import Session
from .baseline import get_baseline
import math


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def _ratio_drift(observed: float, expected: float, cap: float = 3.0) -> float:
    """Drift when observed exceeds expected. 0 if at/below expected."""
    if expected <= 0:
        return _clamp01(observed / cap) if observed > 0 else 0.0
    r = observed / expected
    if r <= 1.0:
        return 0.0
    # map [1..cap] -> [0..1]
    return _clamp01((r - 1.0) / (cap - 1.0))


def compute_drift(sess: Session) -> Tuple[float, List[str]]:
    b = get_baseline(sess.user)
    contributors: List[str] = []

    # ---- Request drift ----
    request_drift = _ratio_drift(sess.requests_per_minute, max(b.avg_requests_per_min, 1.0))
    if request_drift > 0.2:
        contributors.append(f"Request drift {request_drift:.2f} (rate vs baseline)")

    # ---- Sequence drift ----
    if b.common_endpoints:
        unknown = [e for e in sess.unique_endpoints if e not in b.common_endpoints]
        seq_drift = _clamp01(len(unknown) / max(len(sess.unique_endpoints), 1))
    else:
        seq_drift = 0.0
    if seq_drift > 0.25:
        contributors.append(f"Sequence drift {seq_drift:.2f} (novel endpoints)")

    # ---- Device drift ----
    device_drift = 0.0
    if sess.device not in b.common_devices:
        device_drift = 0.8
        contributors.append("Device drift (unknown device)")
    if sess.device_changes > 0:
        device_drift = min(1.0, device_drift + 0.2 * sess.device_changes)
        contributors.append(f"Device changes: {sess.device_changes}")

    # ---- Location drift ----
    location_drift = 0.0
    if sess.location not in b.common_locations:
        location_drift = 0.8
        contributors.append("Location drift (unknown location)")
    if sess.location_changes > 0:
        location_drift = min(1.0, location_drift + 0.2 * sess.location_changes)
        contributors.append(f"Location changes: {sess.location_changes}")

    # ---- Temporal drift ----
    # Longer session than baseline but still active = mild drift
    temporal_drift = _ratio_drift(sess.age_seconds, max(b.avg_session_duration, 60.0), cap=3.0)
    if temporal_drift > 0.3:
        contributors.append(f"Temporal drift {temporal_drift:.2f} (session age)")

    # ---- Access drift ----
    access_drift = _ratio_drift(sess.sensitive_requests, max(b.avg_sensitive_requests, 0.5), cap=4.0)
    if access_drift > 0.2:
        contributors.append(f"Access drift {access_drift:.2f} (sensitive hits)")

    # ---- Failed-request drift ----
    fail_drift = _ratio_drift(sess.failed_requests, max(b.avg_failed_requests, 0.5), cap=4.0)
    if fail_drift > 0.2:
        contributors.append(f"Failure drift {fail_drift:.2f}")

    # ---- Aggregate (weighted) ----
        # ---- Aggregate (weighted) ----
    weights = {
        "request":  0.18,
        "sequence": 0.12,
        "device":   0.25,   # ← raised: device change = strong hijack signal
        "location": 0.20,   # ← raised
        "temporal": 0.05,
        "access":   0.15,
        "failure":  0.05,
    }
    total_w = sum(weights.values())
    drift = (
        request_drift  * weights["request"]  +
        seq_drift      * weights["sequence"] +
        device_drift   * weights["device"]   +
        location_drift * weights["location"] +
        temporal_drift * weights["temporal"] +
        access_drift   * weights["access"]   +
        fail_drift     * weights["failure"]
    ) / total_w

    return _clamp01(drift), contributors
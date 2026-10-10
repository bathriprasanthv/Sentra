"""
Sentra - Rule Engine.
Deterministic detectors. Each rule returns (fired: bool, weight: float, reason: str).
"""
from __future__ import annotations
from typing import List, Tuple
from app.sessions.models import Session
import math


# -------- Thresholds (tunable) --------
RPM_BURST_THRESHOLD       = 60     # requests per minute
RPM_HIGH_THRESHOLD        = 120
FAILED_THRESHOLD          = 5
SENSITIVE_THRESHOLD       = 2
DEVICE_CHANGE_THRESHOLD   = 1
LOCATION_CHANGE_THRESHOLD = 1
ENUMERATION_UNIQUE_RATIO  = 0.75   # unique endpoints / total requests


class RuleResult:
    __slots__ = ("name", "fired", "weight", "reason")
    def __init__(self, name: str, fired: bool, weight: float, reason: str):
        self.name = name
        self.fired = fired
        self.weight = weight
        self.reason = reason

def _log_scale(x: float, base: float, factor: float, cap: float) -> float:
    """Diminishing-return scaling: 0 at x<=base, approaches cap as x grows."""
    if x <= base:
        return 0.0
    return min(cap, factor * math.log(1.0 + (x - base)))


def evaluate_rules(sess: Session) -> List[RuleResult]:
    """Return every rule evaluation (fired or not) so the UI can explain."""
    results: List[RuleResult] = []

    rpm = sess.requests_per_minute

    # --- Request burst: scales smoothly ---
    burst_weight = _log_scale(rpm, base=35.0, factor=14.0, cap=35.0)
    results.append(RuleResult(
        "request_burst",
        rpm >= RPM_BURST_THRESHOLD or rpm >= 40.0,
        burst_weight,
        f"Request rate {rpm:.0f}/min (baseline ~20/min)",
    ))

    # --- Failed requests: 5 = 6pts, 30 = 20pts, 100 = 30pts ---
    fail_weight = _log_scale(sess.failed_requests, base=2.0, factor=10.0, cap=30.0)
    results.append(RuleResult(
        "failed_requests",
        sess.failed_requests >= FAILED_THRESHOLD,
        fail_weight,
        f"{sess.failed_requests} failed requests",
    ))

    # --- Sensitive access: heavy weight, sensitive is bad ---
    sens_weight = _log_scale(sess.sensitive_requests, base=1.0, factor=18.0, cap=40.0)
    results.append(RuleResult(
        "sensitive_access",
        sess.sensitive_requests >= SENSITIVE_THRESHOLD,
        sens_weight,
        f"{sess.sensitive_requests} sensitive endpoint hits",
    ))

    # --- Device change: fixed heavy weight ---
    device_weight = 20.0 if sess.device_changes >= 1 else 0.0
    if sess.device_changes >= 2:
        device_weight = 28.0
    results.append(RuleResult(
        "device_change",
        sess.device_changes >= DEVICE_CHANGE_THRESHOLD,
        device_weight,
        f"{sess.device_changes} device change(s) in session",
    ))

    # --- Location change ---
    location_weight = 20.0 if sess.location_changes >= 1 else 0.0
    if sess.location_changes >= 2:
        location_weight = 28.0
    results.append(RuleResult(
        "location_change",
        sess.location_changes >= LOCATION_CHANGE_THRESHOLD,
        location_weight,
        f"{sess.location_changes} location change(s) in session",
    ))

    # --- Enumeration ---
    total = len(sess.endpoints_sequence) or 1
    ratio = len(sess.unique_endpoints) / total
    enum_weight = 0.0
    if ratio >= ENUMERATION_UNIQUE_RATIO and total >= 10:
        enum_weight = min(20.0, ratio * 20.0)
    results.append(RuleResult(
        "enumeration",
        ratio >= ENUMERATION_UNIQUE_RATIO and total >= 10,
        enum_weight,
        f"Unique endpoint ratio {ratio:.2f} ({len(sess.unique_endpoints)}/{total})",
    ))

    # --- Abnormal navigation ---
    recent = sess.endpoints_sequence[-6:]
    has_sensitive = any("/admin" in e or "/api/keys" in e for e in recent)
    nav_weight = 15.0 if (has_sensitive and rpm >= 30) else 0.0
    results.append(RuleResult(
        "abnormal_navigation",
        has_sensitive and rpm >= 30,
        nav_weight,
        "Recent navigation jumps into privileged area under load",
    ))

    # --- Privilege escalation pattern ---
    # Look for: failed admin attempt followed by successful admin access.
    recent_events = sess.events[-15:]
    had_failed_admin = False
    had_success_admin = False
    for e in recent_events:
        is_admin = "/admin" in e.endpoint or "/api/keys" in e.endpoint
        if is_admin and e.status_code in (401, 403):
            had_failed_admin = True
        if is_admin and e.status_code == 200 and e.event_type in ("ADMIN_ACCESS", "SENSITIVE_ACTION"):
            had_success_admin = True

    priv_esc_fired = had_failed_admin and had_success_admin
    priv_esc_weight = 25.0 if priv_esc_fired else 0.0
    results.append(RuleResult(
        "privilege_escalation",
        priv_esc_fired,
        priv_esc_weight,
        "Privilege escalation pattern (failed probes → successful access)",
    ))

    return results


def _rpm_weight(rpm: float) -> float:
    if rpm >= RPM_HIGH_THRESHOLD:
        return 25.0
    if rpm >= RPM_BURST_THRESHOLD:
        return 15.0
    return 0.0
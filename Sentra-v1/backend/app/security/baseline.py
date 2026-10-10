"""
Sentra - Baseline Engine.
Tracks normal behavior per user.
Only learns while the session is NORMAL — never learns from attacks.
"""
from __future__ import annotations
from app.sessions.models import Session, Baseline
from app.sessions.store import store
import time


EMA_ALPHA = 0.10   # weight of new sample when learning


def update_baseline(sess: Session) -> Baseline:
    b = store.baselines.get(sess.user)
    if b is None:
        b = Baseline(user=sess.user)
        store.baselines[sess.user] = b

    # Only fold in behavior when session is still healthy.
    # Once it drifts to SUSPICIOUS+, stop learning from it.
    if sess.status not in ("NORMAL",):
        return b

    # Require at least 3 events before we start adapting
    if len(sess.events) < 3:
        return b

    rpm    = sess.requests_per_minute
    dur    = sess.age_seconds
    failed = float(sess.failed_requests)
    sens   = float(sess.sensitive_requests)

    a = EMA_ALPHA
    b.avg_requests_per_min   = (1 - a) * b.avg_requests_per_min   + a * rpm
    b.avg_session_duration   = (1 - a) * b.avg_session_duration   + a * dur
    b.avg_failed_requests    = (1 - a) * b.avg_failed_requests    + a * failed
    b.avg_sensitive_requests = (1 - a) * b.avg_sensitive_requests + a * sens

    for ep in list(sess.unique_endpoints)[:10]:
        if ep not in b.common_endpoints and len(b.common_endpoints) < 30:
            b.common_endpoints.append(ep)
    for d in sess.devices_seen:
        if d not in b.common_devices and len(b.common_devices) < 10:
            b.common_devices.append(d)
    for l in sess.locations_seen:
        if l not in b.common_locations and len(b.common_locations) < 10:
            b.common_locations.append(l)

    b.sample_count += 1
    return b


def get_baseline(user: str) -> Baseline:
    b = store.baselines.get(user)
    if b is None:
        b = Baseline(user=user)
        store.baselines[user] = b
    return b
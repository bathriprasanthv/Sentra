"""
Sentra - Security Engine.
Orchestrates: Rules -> Baseline -> Drift -> Risk -> Response.
Publishes state changes to the WebSocket layer.
"""
from __future__ import annotations
import time
from typing import Optional, Dict, Any
from app.sessions.models import Session
from app.sessions.store import store
from .baseline import update_baseline
from .risk import compute_risk
from .response import respond


# Late-binding hook so engine.py doesn't hard-depend on websocket module
_publish_hook = None


def set_publish_hook(fn):
    """Called once from main.py after websocket manager is ready."""
    global _publish_hook
    _publish_hook = fn


async def _publish(payload: Dict[str, Any]):
    if _publish_hook:
        await _publish_hook(payload)


async def analyze_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Run the full pipeline for a session and emit a live update."""
    sess: Optional[Session] = store.get_session(session_id)
    if not sess:
        return None

    prev_status = sess.status
    prev_risk = sess.risk_score

    # 1. Update baseline (learn)
    update_baseline(sess)

    # 2. Compute risk (drift is computed inside)
    score, level, response, contributors, drift_score, drift_contribs = compute_risk(sess)

    # 3. Respond (may create incident)
    action = respond(sess)

    # 4. Emit live update
    snapshot = sess.to_dict()
    snapshot["contributors"] = contributors
    snapshot["drift_contributors"] = drift_contribs
    snapshot["actions"] = action["actions"]
    snapshot["incident_id"] = action["incident_id"]
    snapshot["status_changed"] = (prev_status != level)

    await _publish({
        "type": "session_update",
        "ts": time.time(),
        "session": snapshot,
    })

    if action["incident_id"]:
        inc = store.get_incident(action["incident_id"])
        if inc:
            await _publish({
                "type": "incident_update",
                "ts": time.time(),
                "incident": inc.to_dict(),
            })

    if prev_status != level:
        await _publish({
            "type": "status_change",
            "ts": time.time(),
            "session_id": sess.id,
            "from": prev_status,
            "to": level,
            "risk": score,
            "response": response,
        })

    # Drift threshold cross
    prev_drift = getattr(sess, "_prev_drift", 0.0)
    if prev_drift < 0.5 <= drift_score:
        await _publish({
            "type": "drift_threshold",
            "ts": time.time(),
            "session_id": sess.id,
            "drift": drift_score,
            "threshold": 0.5,
        })
    sess._prev_drift = drift_score

    return snapshot
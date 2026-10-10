"""
Sentra - Response Engine.
Turns risk level into concrete actions + incident creation.
Keeps incidents in sync with the session's current severity.
"""
from __future__ import annotations
import time
from typing import Optional
from app.sessions.models import Session, Incident
from app.sessions.store import store


# Which actions fire at each level
ACTIONS = {
    "NORMAL":     ["allow_session"],
    "SUSPICIOUS": ["increase_monitoring"],
    "ELEVATED":   ["require_reverification", "increase_monitoring"],
    "CRITICAL":   ["restrict_sensitive_ops", "flag_for_review", "require_reverification"],
}


# Severity ranking to compare escalation
_SEV_RANK = {"SUSPICIOUS": 1, "ELEVATED": 2, "CRITICAL": 3}


def respond(sess: Session) -> dict:
    """Apply adaptive response. Create/update incident. Return action summary."""
    level = sess.status
    actions = list(ACTIONS.get(level, ["allow_session"]))

    result = {
        "session_id": sess.id,
        "level": level,
        "response": sess.response,
        "actions": actions,
        "incident_id": None,
        "incident_updated": False,
    }

    if level in ("ELEVATED", "CRITICAL"):
        incident, updated = _upsert_incident(sess, actions)
        if incident:
            result["incident_id"] = incident.id
            result["incident_updated"] = updated

    return result


def _upsert_incident(sess: Session, actions: list):
    """
    Find open incident for this session, and:
      - Update metrics (risk, drift, indicators, actions, events)
      - Escalate severity upward if the session worsened
    Returns (incident, updated_flag)
    """
    existing: Optional[Incident] = None
    for inc in store.incidents.values():
        if inc.session_id == sess.id and inc.status == "OPEN":
            existing = inc
            break

    # Build fresh indicators
    fresh_indicators = list(dict.fromkeys(sess.risk_contributors))[:15]
    fresh_event_ids  = [e.id for e in sess.events[-50:]]
    new_actions      = list(dict.fromkeys(actions))

    if existing is None:
        # Create new
        inc = store.create_incident(
            session_id=sess.id,
            user=sess.user,
            severity=sess.status,
            detected_at=time.time(),
            indicators=fresh_indicators,
            risk_score=sess.risk_score,
            drift_score=sess.drift_score,
            event_ids=fresh_event_ids,
            actions_taken=new_actions,
            status="OPEN",
        )
        return inc, False

    # Update existing
    updated = False

    # Escalate severity only upward
    if _SEV_RANK.get(sess.status, 0) > _SEV_RANK.get(existing.severity, 0):
        existing.severity = sess.status
        updated = True

    # Always refresh metrics
    if sess.risk_score > existing.risk_score:
        existing.risk_score = sess.risk_score
        updated = True
    if sess.drift_score > existing.drift_score:
        existing.drift_score = sess.drift_score
        updated = True

    # Merge indicators and actions
    merged_ind = list(dict.fromkeys(existing.indicators + fresh_indicators))[:15]
    if merged_ind != existing.indicators:
        existing.indicators = merged_ind
        updated = True

    merged_act = list(dict.fromkeys(existing.actions_taken + new_actions))
    if merged_act != existing.actions_taken:
        existing.actions_taken = merged_act
        updated = True

    existing.event_ids = fresh_event_ids

    return existing, updated
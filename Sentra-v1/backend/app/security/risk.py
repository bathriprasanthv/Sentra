"""
Sentra - Risk Engine.
Fuses Rule engine + Drift engine + ML engine + Session context -> Risk Score (0-100).
"""
from __future__ import annotations
from typing import List, Tuple
from app.sessions.models import Session
from app.ml.engine import ml_engine
from .rules import evaluate_rules
from .drift import compute_drift


# Thresholds
LEVEL_NORMAL     = (0, 29)
LEVEL_SUSPICIOUS = (30, 59)
LEVEL_ELEVATED   = (60, 79)
LEVEL_CRITICAL   = (80, 100)


def _level(score: float) -> str:
    if score <= LEVEL_NORMAL[1]:
        return "NORMAL"
    if score <= LEVEL_SUSPICIOUS[1]:
        return "SUSPICIOUS"
    if score <= LEVEL_ELEVATED[1]:
        return "ELEVATED"
    return "CRITICAL"


def _response_for(level: str) -> str:
    return {
        "NORMAL":     "ALLOW",
        "SUSPICIOUS": "MONITOR",
        "ELEVATED":   "VERIFY",
        "CRITICAL":   "RESTRICT",
    }[level]


def compute_risk(sess: Session) -> Tuple[float, str, str, List[str], float, List[str]]:
    """
    Returns: risk_score, level, response, risk_contributors, drift_score, drift_contributors
    """
    # ---- 1. Rules ----
    rules = evaluate_rules(sess)
    rule_points = 0.0
    fired_count = 0
    risk_contributors: List[str] = []
    for r in rules:
        if r.fired:
            rule_points += r.weight
            fired_count += 1
            risk_contributors.append(r.reason)

    # ---- 2. Drift ----
    drift_score, drift_contributors = compute_drift(sess)
    drift_points = drift_score * 55.0
    if drift_score >= 0.15:
        risk_contributors.append(f"Behavioral drift {drift_score:.2f}")

    # ---- 3. ML (supporting signal, capped at 20 pts) ----
    ml_score = ml_engine.score_session(sess)
    sess.ml_anomaly_score = ml_score
    ml_points = ml_score * 20.0
    if ml_score >= 0.65:
        risk_contributors.append(
            f"ML anomaly score {ml_score:.2f} (Isolation Forest)"
        )

    # ---- 4. Compound signal bonus ----
    synergy = 0.0
    if fired_count >= 3:
        synergy = 10.0 + (fired_count - 3) * 5.0
        risk_contributors.append(
            f"Compound signal: {fired_count} concurrent indicators"
        )

    # ---- 5. Session age bonus ----
    age_points = 0.0
    if sess.age_seconds > 900 and drift_score > 0.4:
        age_points = 5.0
        risk_contributors.append("Prolonged anomalous session")

    # ---- 6. Combine & clamp ----
    raw = rule_points + drift_points + ml_points + synergy + age_points
    score = max(0.0, min(100.0, raw))

    level = _level(score)
    response = _response_for(level)

    # ---- 7. Store on session ----
    sess.risk_score = score
    sess.drift_score = drift_score
    sess.status = level
    sess.response = response
    sess.risk_contributors = risk_contributors[:10]
    sess.drift_contributors = drift_contributors[:10]

    return score, level, response, risk_contributors, drift_score, drift_contributors
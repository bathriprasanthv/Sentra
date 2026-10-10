"""
Sentra - Lab Runner.
Executes a scenario against a live session, step-by-step.
Each step is dispatched through session_manager.ingest() and analyzed by
the Security Engine, so every event flows through the REAL pipeline.
"""
from __future__ import annotations
import asyncio
import time
from typing import Optional, Dict, Any, List

from .manager import session_manager
from .store import store
from .scenarios import SCENARIOS, SCENARIO_META


# Track active scenario runs to prevent concurrent runs on the same session
_active_runs: Dict[str, bool] = {}


async def run_scenario(
    scenario_key: str,
    user: str = "alice",
    device: str = "device-known-01",
    location: str = "Mumbai",
    speed: float = 1.0,
) -> Dict[str, Any]:
    """
    Launch a scenario. Returns summary.
    speed: multiplier — 2.0 = twice as fast, 0.5 = half speed (for live demos).
    """
    if scenario_key not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario_key}")

    steps = SCENARIOS[scenario_key]
    meta = SCENARIO_META[scenario_key]

    # Fresh session per scenario run
    sess = session_manager.login(user=user, device=device, location=location)

    # Run the pipeline once on login
    from app.security.engine import analyze_session
    await analyze_session(sess.id)

    _active_runs[sess.id] = True

    started_at = time.time()
    try:
        for delay, payload in steps:
            if not _active_runs.get(sess.id):
                break

            # Respect speed multiplier
            await asyncio.sleep(delay / max(speed, 0.01))

            # Skip if session disappeared
            if store.get_session(sess.id) is None:
                break

            # Handle special action markers
            if isinstance(payload, dict) and "__action__" in payload:
                action = payload["__action__"]
                value = payload.get("value", "")
                if action == "device":
                    # Silently change device via a heartbeat event
                    session_manager.ingest(
                        session_id=sess.id,
                        event_type="SESSION_CHANGE",
                        endpoint="/device",
                        method="POST",
                        status_code=200,
                        device=value,
                        meta={"change": "device"},
                    )
                elif action == "location":
                    session_manager.ingest(
                        session_id=sess.id,
                        event_type="SESSION_CHANGE",
                        endpoint="/location",
                        method="POST",
                        status_code=200,
                        location=value,
                        meta={"change": "location"},
                    )
                # Analyze after action
                await analyze_session(sess.id)
                continue

            # Regular event
            session_manager.ingest(
                session_id=sess.id,
                event_type=payload.get("event_type", "PAGE_VIEW"),
                endpoint=payload.get("endpoint", "/"),
                method=payload.get("method", "GET"),
                status_code=payload.get("status_code", 200),
                device=payload.get("device"),
                location=payload.get("location"),
                meta=payload.get("meta", {}),
            )
            await analyze_session(sess.id)

    finally:
        _active_runs.pop(sess.id, None)

    elapsed = time.time() - started_at
    final = store.get_session(sess.id)

    return {
        "scenario": scenario_key,
        "label": meta["label"],
        "severity": meta["severity"],
        "session_id": sess.id,
        "user": user,
        "steps": len(steps),
        "elapsed_seconds": round(elapsed, 2),
        "final_status": final.status if final else "CLOSED",
        "final_risk": round(final.risk_score, 1) if final else 0.0,
        "final_drift": round(final.drift_score, 3) if final else 0.0,
        "final_ml": round(final.ml_anomaly_score, 3) if final else 0.0,
    }


def stop_scenario(session_id: str) -> None:
    _active_runs.pop(session_id, None)
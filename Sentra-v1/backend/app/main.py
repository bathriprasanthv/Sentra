"""
Sentra - FastAPI entrypoint.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi import WebSocket
from app.websocket.routes import security_ws
from app.websocket.manager import manager
from app.security.engine import set_publish_hook

from app.ml.engine import ml_engine
from app.sessions.manager import session_manager
from app.sessions.store import store
from app.security.engine import analyze_session, set_publish_hook
from app.sessions.lab_runner import run_scenario, stop_scenario
from app.sessions.scenarios import SCENARIOS, SCENARIO_META

app = FastAPI(title="Sentra", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "sentra-backend"}


@app.get("/")
def root():
    return {"name": "Sentra", "tagline": "Understand every session. Respond to every change."}


# ---------- Smoke-test endpoints for Phase 2 ----------
class LoginReq(BaseModel):
    user: str = "alice"
    device: str = "device-known-01"
    location: str = "Mumbai"


@app.post("/api/smoke/login")
async def smoke_login(req: LoginReq):
    sess = session_manager.login(req.user, req.device, req.location)
    await analyze_session(sess.id)
    return sess.to_dict()


class EventReq(BaseModel):
    session_id: str
    endpoint: str
    event_type: str = "PAGE_VIEW"
    method: str = "GET"
    status_code: int = 200
    device: str | None = None
    location: str | None = None


@app.post("/api/smoke/event")
async def smoke_event(req: EventReq):
    ev = session_manager.ingest(
        session_id=req.session_id,
        event_type=req.event_type,
        endpoint=req.endpoint,
        method=req.method,
        status_code=req.status_code,
        device=req.device,
        location=req.location,
    )
    if not ev:
        raise HTTPException(404, "session not found")
    snap = await analyze_session(req.session_id)
    return snap


@app.get("/api/smoke/sessions")
def smoke_sessions():
    return [s.to_dict() for s in store.list_sessions()]


@app.get("/api/smoke/incidents")
def smoke_incidents():
    return [i.to_dict() for i in store.list_incidents()]


@app.post("/api/smoke/reset")
def smoke_reset():
    store.reset()
    return {"ok": True}

@app.get("/api/smoke/debug/ml/{session_id}")
def debug_ml(session_id: str):
    """Debug endpoint: shows the exact features + raw scores fed into ML."""
    from app.sessions.store import store
    from app.ml.engine import ml_engine
    import numpy as np

    sess = store.get_session(session_id)
    if not sess:
        raise HTTPException(404, "session not found")

    X = ml_engine._extract_features(sess)
    features = dict(zip(ml_engine.features, X[0].tolist()))

    Xs = ml_engine.scaler.transform(X)

    raw_ss = float(-ml_engine.model.score_samples(Xs)[0])       # score_samples (negated)
    raw_df = float(ml_engine.model.decision_function(Xs)[0])    # decision_function

    return {
        "session_id": session_id,
        "model_ready": ml_engine.ready,
        "event_count": len(sess.events),
        "features": features,
        "raw_score_samples_neg": raw_ss,
        "raw_decision_function": raw_df,
        "final_score": ml_engine.score_session(sess),
        "score_history_len": len(ml_engine._raw_history),
        "score_history": ml_engine._raw_history[-10:],
    }

@app.on_event("startup")
async def _startup():
    ml_engine.load()
    print("[Sentra] ML engine:", "READY" if ml_engine.ready else "DISABLED")

    # Register WebSocket publisher hook with the security engine
    async def _publisher(payload: dict):
        await manager.broadcast(payload)

    set_publish_hook(_publisher)
    print("[Sentra] WebSocket publisher registered")


@app.get("/api/ml/health")
def ml_health():
    return ml_engine.health()

# ---------- Security Lab ----------
class LabRunReq(BaseModel):
    scenario: str
    user: str = "alice"
    device: str = "device-known-01"
    location: str = "Mumbai"
    speed: float = 1.0     # 1.0 = real time, 2.0 = fast


@app.get("/api/lab/scenarios")
def list_scenarios():
    return [
        {"key": k, "label": SCENARIO_META[k]["label"], "severity": SCENARIO_META[k]["severity"]}
        for k in SCENARIOS.keys()
    ]


@app.post("/api/lab/run")
async def lab_run(req: LabRunReq):
    try:
        result = await run_scenario(
            scenario_key=req.scenario,
            user=req.user,
            device=req.device,
            location=req.location,
            speed=req.speed,
        )
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/lab/stop/{session_id}")
def lab_stop(session_id: str):
    stop_scenario(session_id)
    return {"ok": True}

@app.websocket("/ws/security")
async def ws_security(ws: WebSocket):
    await security_ws(ws)


@app.get("/api/ws/health")
def ws_health():
    return {"clients": manager.client_count()}


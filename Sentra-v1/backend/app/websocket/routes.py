"""
Sentra - WebSocket routes.
"""
from __future__ import annotations
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from .manager import manager


async def security_ws(ws: WebSocket):
    """
    Main live stream: sessions, incidents, events, status changes.
    Sends a heartbeat every 15 seconds to keep the connection alive.
    """
    await manager.connect(ws)

    # Send welcome snapshot
    try:
        from app.sessions.store import store
        await ws.send_json({
            "type": "hello",
            "ts": _now(),
            "sessions": [s.to_dict() for s in store.list_sessions()],
            "incidents": [i.to_dict() for i in store.list_incidents()],
        })
    except Exception:
        pass

    # Heartbeat loop
    async def heartbeat():
        while True:
            await asyncio.sleep(15)
            try:
                await ws.send_json({"type": "heartbeat", "ts": _now()})
            except Exception:
                break

    hb = asyncio.create_task(heartbeat())

    try:
        while True:
            # We don't expect messages from clients, but drain them
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        hb.cancel()
        await manager.disconnect(ws)


def _now():
    import time
    return time.time()
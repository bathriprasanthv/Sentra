"""
Sentra - WebSocket Connection Manager.
Tracks connected clients and broadcasts security state changes.
"""
from __future__ import annotations
import asyncio
import json
import time
from typing import Set, Dict, Any
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.clients: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._event_buffer = []           # recent broadcasts (for late-joiners)
        self._max_buffer = 50

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self.clients.add(ws)
        # Replay last few events to the new client so they see context
        for payload in list(self._event_buffer)[-10:]:
            try:
                await ws.send_json(payload)
            except Exception:
                break
        print(f"[WS] client connected — total={len(self.clients)}")

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            self.clients.discard(ws)
        print(f"[WS] client disconnected — total={len(self.clients)}")

    async def broadcast(self, payload: Dict[str, Any]):
        """Send payload to all connected clients. Non-blocking for senders."""
        async with self._lock:
            self._event_buffer.append(payload)
            if len(self._event_buffer) > self._max_buffer:
                self._event_buffer = self._event_buffer[-self._max_buffer:]
            clients = list(self.clients)

        dead = []
        for ws in clients:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)

        for ws in dead:
            await self.disconnect(ws)

    def client_count(self) -> int:
        return len(self.clients)


manager = ConnectionManager()
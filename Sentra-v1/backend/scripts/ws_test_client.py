"""
Sentra - WebSocket test client.
Subscribes to /ws/security and prints every message.
Run in a separate terminal while running the lab.
"""
import asyncio
import json
import websockets


async def main():
    uri = "ws://localhost:8000/ws/security"
    print(f"Connecting to {uri}...")
    async with websockets.connect(uri) as ws:
        print("Connected. Listening for messages (Ctrl+C to quit)...\n")
        while True:
            msg = await ws.recv()
            try:
                data = json.loads(msg)
                t = data.get("type", "?")
                if t == "hello":
                    print(f"[HELLO] sessions={len(data.get('sessions', []))} incidents={len(data.get('incidents', []))}")
                elif t == "heartbeat":
                    print(f"[HEARTBEAT]")
                elif t == "raw_event":
                    ev = data["event"]
                    print(f"[EVENT] {ev['event_type']:20s} {ev['endpoint']:30s} user={ev['user']} status={ev['status_code']}")
                elif t == "session_update":
                    s = data["session"]
                    print(f"[SESSION] {s['id'][:16]} status={s['status']:10s} risk={s['risk_score']:5.1f} drift={s['drift_score']:.3f} ml={s['ml_anomaly_score']:.3f}")
                elif t == "status_change":
                    print(f"[STATUS] {data['session_id'][:16]} {data['from']} -> {data['to']} (risk={data['risk']}, resp={data['response']})")
                elif t == "incident_update":
                    inc = data["incident"]
                    print(f"[INCIDENT] {inc['id']} severity={inc['severity']} risk={inc['risk_score']:.1f}")
                elif t == "drift_threshold":
                    print(f"[DRIFT>0.5] {data['session_id'][:16]} drift={data['drift']:.3f}")
                else:
                    print(f"[{t.upper()}] {msg[:200]}")
            except json.JSONDecodeError:
                print(f"[RAW] {msg[:200]}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nBye.")
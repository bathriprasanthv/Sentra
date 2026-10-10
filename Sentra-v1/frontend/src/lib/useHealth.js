import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function useHealth(pollMs = 5000) {
  const [health, setHealth] = useState({
    backend: false,
    ml: false,
    wsClients: 0,
  });

  useEffect(() => {
    let alive = true;
    let timer;

    async function poll() {
      try {
        const [h, ml, ws] = await Promise.all([
          api.health().catch(() => null),
          api.mlHealth().catch(() => null),
          api.wsHealth().catch(() => null),
        ]);
        if (!alive) return;
        setHealth({
          backend: !!(h && h.status === 'ok'),
          ml: !!(ml && ml.ready),
          wsClients: ws ? ws.clients : 0,
        });
      } catch {
        if (alive) setHealth({ backend: false, ml: false, wsClients: 0 });
      }
      if (alive) timer = setTimeout(poll, pollMs);
    }

    poll();
    return () => { alive = false; clearTimeout(timer); };
  }, [pollMs]);

  return health;
}
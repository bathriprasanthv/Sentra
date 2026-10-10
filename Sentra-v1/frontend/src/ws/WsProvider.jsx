import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const WSContext = createContext(null);

export function WsProvider({ children }) {
  const wsRef = useRef(null);
  const listenersRef = useRef(new Set());
  const reconnectTimerRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  const emit = useCallback((msg) => {
    setLastMessage(msg);
    for (const fn of listenersRef.current) {
      try { fn(msg); } catch (e) { console.error('[WsProvider] listener error', e); }
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${window.location.host}/ws/security`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('[WS] connected');
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        emit(data);
      // eslint-disable-next-line no-unused-vars
      } catch (e) {
        console.warn('[WS] invalid message', ev.data);
      }
    };
    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Auto-reconnect after 2s
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      // eslint-disable-next-line react-hooks/immutability
      reconnectTimerRef.current = setTimeout(connect, 2000);
    };
    ws.onerror = (e) => {
      console.warn('[WS] error', e);
    };
  }, [emit]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const subscribe = useCallback((fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);

  return (
    <WSContext.Provider value={{ connected, lastMessage, subscribe }}>
      {children}
    </WSContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWs() {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error('useWs must be used inside WsProvider');
  return ctx;
}
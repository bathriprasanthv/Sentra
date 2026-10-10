import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { getDemoSession } from './demoSession.js';

export function usePageTelemetry(endpoint, opts = {}) {
  const {
    autoApi = null,
    apiDelay = 700,
    redirectIfNoSession = true,
  } = opts;

  const nav = useNavigate();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const sess = getDemoSession();
    if (!sess) {
      if (redirectIfNoSession) nav('/login');
      return;
    }

    api.sendEvent(sess.id, endpoint, 'PAGE_VIEW').catch(() => {});

    if (autoApi) {
      setTimeout(() => {
        api.sendEvent(sess.id, autoApi, 'API_REQUEST').catch(() => {});
      }, apiDelay);
    }
  }, [endpoint, autoApi, apiDelay, nav, redirectIfNoSession]);
}
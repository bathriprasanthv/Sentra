const BASE = ''; // Vite proxies /api → http://localhost:8000

async function req(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  // Health
  health: () => req('/api/health'),
  mlHealth: () => req('/api/ml/health'),
  wsHealth: () => req('/api/ws/health'),

  // Sessions / Incidents
  listSessions: () => req('/api/smoke/sessions'),
  listIncidents: () => req('/api/smoke/incidents'),

  // Lab
  listScenarios: () => req('/api/lab/scenarios'),
  runScenario: (scenario, speed = 1.0) =>
    req('/api/lab/run', {
      method: 'POST',
      body: JSON.stringify({ scenario, speed }),
    }),

  // Reset
  reset: () => req('/api/smoke/reset', { method: 'POST' }),

  // Demo app
  login: (user, device, location) =>
    req('/api/smoke/login', {
      method: 'POST',
      body: JSON.stringify({ user, device, location }),
    }),
  sendEvent: (session_id, endpoint, event_type = 'PAGE_VIEW', extra = {}) =>
    req('/api/smoke/event', {
      method: 'POST',
      body: JSON.stringify({ session_id, endpoint, event_type, ...extra }),
    }),
};
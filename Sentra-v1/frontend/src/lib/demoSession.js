const KEY = 'sentra.demo.session';

export function getDemoSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setDemoSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearDemoSession() {
  localStorage.removeItem(KEY);
}
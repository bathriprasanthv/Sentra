import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { clearDemoSession, getDemoSession } from '../lib/demoSession.js';
import { shortId } from '../lib/format.js';

export function DemoHeader() {
  const nav = useNavigate();
  const sess = getDemoSession();

  async function logout() {
    if (sess) {
      try { await api.sendEvent(sess.id, '/logout', 'LOGOUT'); } catch { /* empty */ }
    }
    clearDemoSession();
    nav('/login');
  }

  return (
    <div className="session-strip">
      <div className="row center gap-3">
        <span>
          Session <span className="sid">{sess ? shortId(sess.id, 20) : '—'}</span>
        </span>
        <span className="text-mute">·</span>
        <span>
          User <span style={{ color: 'var(--tx-0)' }}>{sess?.user || '—'}</span>
        </span>
      </div>
      <button className="btn ghost small" onClick={logout}>Sign out</button>
    </div>
  );
}
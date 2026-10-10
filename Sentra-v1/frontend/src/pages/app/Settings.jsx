import { useState } from 'react';
import { api } from '../../api/client';
import { DemoHeader } from '../../components/DemoHeader';
import { getDemoSession } from '../../lib/demoSession';
import { usePageTelemetry } from '../../lib/usePageTelemetry';

const INITIAL = {
  mfa: true,
  sessionAlerts: true,
  ipAllowlist: false,
  autoLogout: true,
  auditLog: true,
};

export default function Settings() {
  usePageTelemetry('/settings');
  const [state, setState] = useState(INITIAL);

  async function toggle(key) {
    const next = { ...state, [key]: !state[key] };
    setState(next);
    const sess = getDemoSession();
    if (!sess) return;
    await api.sendEvent(sess.id, '/settings/security', 'SENSITIVE_ACTION');
  }

  async function visitAdmin() {
    const sess = getDemoSession();
    if (!sess) return;
    await api.sendEvent(sess.id, '/admin', 'ADMIN_ACCESS');
  }

  return (
    <div className="app-page">
      <DemoHeader />
      <div className="app-hero">
        <div>
          <h2>Settings</h2>
          <p>Account and security preferences</p>
        </div>
        <button className="btn" onClick={visitAdmin}>Admin area</button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Security</span>
        </div>

        <div className="toggle-row">
          <div>
            <div className="label">Two-factor authentication</div>
            <div className="desc">Require OTP at every login</div>
          </div>
          <div
            className={`toggle-switch ${state.mfa ? 'on' : ''}`}
            onClick={() => toggle('mfa')}
          />
        </div>

        <div className="toggle-row">
          <div>
            <div className="label">Session alerts</div>
            <div className="desc">Email me whenever a new session starts</div>
          </div>
          <div
            className={`toggle-switch ${state.sessionAlerts ? 'on' : ''}`}
            onClick={() => toggle('sessionAlerts')}
          />
        </div>

        <div className="toggle-row">
          <div>
            <div className="label">IP allowlist</div>
            <div className="desc">Restrict sign-ins to specific networks</div>
          </div>
          <div
            className={`toggle-switch ${state.ipAllowlist ? 'on' : ''}`}
            onClick={() => toggle('ipAllowlist')}
          />
        </div>

        <div className="toggle-row">
          <div>
            <div className="label">Automatic logout</div>
            <div className="desc">End inactive sessions after 30 minutes</div>
          </div>
          <div
            className={`toggle-switch ${state.autoLogout ? 'on' : ''}`}
            onClick={() => toggle('autoLogout')}
          />
        </div>

        <div className="toggle-row">
          <div>
            <div className="label">Audit log</div>
            <div className="desc">Record every sensitive action</div>
          </div>
          <div
            className={`toggle-switch ${state.auditLog ? 'on' : ''}`}
            onClick={() => toggle('auditLog')}
          />
        </div>
      </div>
    </div>
  );
}
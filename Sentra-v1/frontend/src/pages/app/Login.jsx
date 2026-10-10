import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { setDemoSession } from '../../lib/demoSession';

const KNOWN_DEVICE = 'device-known-01';
const KNOWN_LOCATION = 'Mumbai';

export default function Login() {
  const nav = useNavigate();
  const [user, setUser] = useState('alice');
  const [device, setDevice] = useState(KNOWN_DEVICE);
  const [location, setLocation] = useState(KNOWN_LOCATION);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const session = await api.login(user.trim(), device, location);
      setDemoSession(session);
      nav('/app/dashboard');
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src="/sentra.svg" alt="Sentra" />
          <div className="login-brand-text">
            <strong>SENTRA</strong>
            <span>Demo Application</span>
          </div>
        </div>

        <h1 className="login-title">Sign in</h1>
        <p className="login-sub">
          This is a safe, local demo app. Every action here generates
          security telemetry that Sentra observes in real time.
        </p>

        <span className="login-hint">
          <span className="dot accent pulse" /> All activity is monitored
        </span>

        {err && <div className="login-error">{err}</div>}

        <form onSubmit={submit} className="login-form">
          <div className="field">
            <label className="field-label">Username</label>
            <input
              className="input"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoFocus
            />
          </div>

          <div className="field">
            <label className="field-label">Password</label>
            <input
              className="input"
              type="password"
              defaultValue="demo-password"
              disabled
            />
          </div>

          <div className="field">
            <label className="field-label">Device (simulated fingerprint)</label>
            <select
              className="input"
              value={device}
              onChange={(e) => setDevice(e.target.value)}
            >
              <option value={KNOWN_DEVICE}>device-known-01 (trusted)</option>
              <option value="device-work-laptop">device-work-laptop</option>
              <option value="device-UNKNOWN-99">device-UNKNOWN-99</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label">Location (simulated)</label>
            <select
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value={KNOWN_LOCATION}>Mumbai</option>
              <option value="Delhi">Delhi</option>
              <option value="Tokyo">Tokyo</option>
              <option value="Unknown-Region">Unknown-Region</option>
            </select>
          </div>

          <button className="btn primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="login-footnote">
          <div className="kv-mini"><span>Mode</span><span>Local demo</span></div>
          <div className="kv-mini"><span>Telemetry</span><span>Enabled</span></div>
          <div className="kv-mini"><span>Monitoring</span><span>Sentra · live</span></div>
        </div>
      </div>
    </div>
  );
}
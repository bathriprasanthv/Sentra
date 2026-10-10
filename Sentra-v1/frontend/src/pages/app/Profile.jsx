import { DemoHeader } from '../../components/DemoHeader';
import { usePageTelemetry } from '../../lib/usePageTelemetry';
import { getDemoSession } from '../../lib/demoSession';

export default function Profile() {
  usePageTelemetry('/profile');
  const sess = getDemoSession();

  return (
    <div className="app-page">
      <DemoHeader />
      <div className="app-hero">
        <div>
          <h2>Profile</h2>
          <p>Your account details</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Account</span>
        </div>
        <div className="kv">
          <span className="kv-key">User</span>
          <span className="kv-val">{sess?.user || 'alice'}</span>

          <span className="kv-key">Email</span>
          <span className="kv-val">alice@sentra.demo</span>

          <span className="kv-key">Role</span>
          <span className="kv-val">Standard User</span>

          <span className="kv-key">Session ID</span>
          <span className="kv-val">{sess?.id || '—'}</span>

          <span className="kv-key">Device</span>
          <span className="kv-val">{sess?.device || '—'}</span>

          <span className="kv-key">Location</span>
          <span className="kv-val">{sess?.location || '—'}</span>
        </div>
      </div>
    </div>
  );
}
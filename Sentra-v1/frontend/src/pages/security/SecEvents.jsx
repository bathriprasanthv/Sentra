import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWs } from '../../ws/WsProvider';
import { PageHeader } from '../../components/PageHeader';
import { EventRow } from '../../components/EventRow';
import { LiveBadge } from '../../components/LiveBadge';

const TYPES = ['ALL', 'LOGIN', 'PAGE_VIEW', 'API_REQUEST', 'FAILED_REQUEST', 'SENSITIVE_ACTION', 'ADMIN_ACCESS', 'SESSION_CHANGE'];

export default function SecEvents() {
  const nav = useNavigate();
  const { subscribe, connected } = useWs();
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'raw_event' && !paused) {
        setEvents((prev) => [msg.event, ...prev].slice(0, 500));
      }
    });
  }, [subscribe, paused]);

  const filtered = filter === 'ALL'
    ? events
    : events.filter((e) => e.event_type === filter);

  return (
    <div>
      <PageHeader
        title="Event Stream"
        sub="Raw security telemetry from all active sessions"
        right={
          <>
            <LiveBadge on={connected && !paused} label={paused ? 'Paused' : connected ? 'Live' : 'Offline'} />
            <button
              className={`btn small ${paused ? 'primary' : 'ghost'}`}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button className="btn ghost small" onClick={() => setEvents([])}>Clear</button>
          </>
        }
      />

      <div className="filter-bar">
        {TYPES.map((t) => (
          <button
            key={t}
            className={`filter-chip ${filter === t ? 'active' : ''}`}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Live Feed</span>
          <span className="panel-sub">
            {filtered.length} events in buffer
          </span>
        </div>
        <div className="event-feed" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          {filtered.length === 0 ? (
            <div className="empty">
              <span className="empty-icon">◌</span>
              Waiting for events… open the demo app or run a lab scenario.
            </div>
          ) : (
            filtered.map((e, i) => (
              <div
                key={e.id + i}
                style={{ cursor: 'pointer' }}
                onClick={() => nav(`/security/sessions/${e.session_id}`)}
              >
                <EventRow event={e} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
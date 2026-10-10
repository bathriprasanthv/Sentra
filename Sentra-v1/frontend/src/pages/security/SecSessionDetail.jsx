import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../../api/client';
import { useWs } from '../../ws/WsProvider';
import { PageHeader } from '../../components/PageHeader';
import { SeverityBadge } from '../../components/SeverityBadge';
import { EventRow } from '../../components/EventRow';
import { LiveBadge } from '../../components/LiveBadge';
import { fmtDuration, fmtRelative, fmtTimeShort, shortId } from '../../lib/format';

const TONE = (s) => (s || '').toLowerCase();

export default function SecSessionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { subscribe, connected } = useWs();

  const [session, setSession] = useState(null);
  const [incident, setIncident] = useState(null);
  const [timeline, setTimeline] = useState([]);     // rolling samples
  const [events, setEvents] = useState([]);         // raw events
  const lastContribsRef = useRef([]);

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const s = await api.listSessions();
        const found = s.find((x) => x.id === id);
        if (found) setSession(found);

        const incs = await api.listIncidents();
        const inc = incs.find((x) => x.session_id === id && x.status === 'OPEN');
        if (inc) setIncident(inc);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [id]);

  // Subscribe
  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'hello') {
        const found = (msg.sessions || []).find((x) => x.id === id);
        if (found) setSession(found);
        const inc = (msg.incidents || []).find((x) => x.session_id === id);
        if (inc) setIncident(inc);
      } else if (msg.type === 'session_update' && msg.session.id === id) {
        setSession(msg.session);
        setTimeline((prev) => [
          ...prev,
          {
            t: Date.now(),
            risk: msg.session.risk_score,
            drift: msg.session.drift_score * 100,        // 0-100 scale for chart
            ml: msg.session.ml_anomaly_score * 100,
          },
        ].slice(-80));
        if (msg.session.contributors) lastContribsRef.current = msg.session.contributors;
      } else if (msg.type === 'raw_event' && msg.event.session_id === id) {
        setEvents((prev) => [msg.event, ...prev].slice(0, 200));
      } else if (msg.type === 'incident_update' && msg.incident.session_id === id) {
        setIncident(msg.incident);
      } else if (msg.type === 'status_change' && msg.session_id === id) {
        // will be reflected on next session_update
      }
    });
  }, [subscribe, id]);

  const contributors = useMemo(
    () => (session?.risk_contributors && session.risk_contributors.length
      ? session.risk_contributors
      // eslint-disable-next-line react-hooks/refs
      : lastContribsRef.current),
    [session]
  );

  if (!session) {
    return (
      <div>
        <PageHeader title="Session Investigation" sub={`Session ${shortId(id || '')}`} />
        <div className="panel">
          <div className="empty">
            <span className="empty-icon">◌</span>
            Session not found or no longer active.
            <div style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => nav('/security/sessions')}>
                Back to sessions
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tone = TONE(session.status);

  return (
    <div>
      <PageHeader
        title="Session Investigation"
        sub={`Session ${shortId(session.id, 24)} · user ${session.user}`}
        right={
          <>
            <LiveBadge on={connected} label={connected ? 'Live' : 'Offline'} />
            <button className="btn ghost small" onClick={() => nav('/security/sessions')}>
              ← Sessions
            </button>
          </>
        }
      />

      {/* Hero */}
      <div className={`detail-hero ${tone}`}>
        <div className="detail-hero-head">
          <div className="detail-hero-title">
            <h2>{shortId(session.id, 20)}</h2>
            <SeverityBadge status={session.status} />
            <span className="pill">{session.response}</span>
          </div>
          <div className="detail-hero-meta">
            <span><b>User</b> {session.user}</span>
            <span><b>Device</b> {session.device}</span>
            <span><b>Location</b> {session.location}</span>
            <span><b>IP</b> {session.ip}</span>
            <span><b>Age</b> {fmtDuration(session.age_seconds)}</span>
          </div>
        </div>

        <div className="detail-metrics">
          <div className="detail-metric">
            <div className="detail-metric-label">Risk Score</div>
            <div className="detail-metric-value" style={{ color: `var(--sev-${tone})` }}>
              {session.risk_score.toFixed(0)}
            </div>
            <div className="detail-metric-sub">0–100</div>
          </div>
          <div className="detail-metric">
            <div className="detail-metric-label">Drift</div>
            <div className="detail-metric-value">{session.drift_score.toFixed(3)}</div>
            <div className="detail-metric-sub">0.00–1.00</div>
          </div>
          <div className="detail-metric">
            <div className="detail-metric-label">ML Anomaly</div>
            <div className="detail-metric-value">{session.ml_anomaly_score.toFixed(3)}</div>
            <div className="detail-metric-sub">Isolation Forest</div>
          </div>
          <div className="detail-metric">
            <div className="detail-metric-label">Requests / min</div>
            <div className="detail-metric-value">{session.requests_per_minute.toFixed(0)}</div>
            <div className="detail-metric-sub">baseline ~20</div>
          </div>
          <div className="detail-metric">
            <div className="detail-metric-label">Failed</div>
            <div className="detail-metric-value">{session.failed_requests}</div>
          </div>
          <div className="detail-metric">
            <div className="detail-metric-label">Sensitive</div>
            <div className="detail-metric-value">{session.sensitive_requests}</div>
          </div>
          <div className="detail-metric">
            <div className="detail-metric-label">Device Changes</div>
            <div className="detail-metric-value">{session.device_changes}</div>
          </div>
          <div className="detail-metric">
            <div className="detail-metric-label">Location Changes</div>
            <div className="detail-metric-value">{session.location_changes}</div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="session-detail">
        <div className="col gap-4">
          {/* Chart */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Risk · Drift · ML Evolution</span>
              <span className="panel-sub">{timeline.length} samples</span>
            </div>
            <div style={{ height: 240 }}>
              {timeline.length < 2 ? (
                <div className="empty" style={{ padding: 60 }}>
                  Collecting samples… the chart appears as events stream in.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
                    <XAxis
                      dataKey="t"
                      tickFormatter={(v) => fmtTimeShort(v / 1000)}
                      stroke="var(--tx-3)"
                      tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      minTickGap={40}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="var(--tx-3)"
                      tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-2)',
                        border: '1px solid var(--line-strong)',
                        borderRadius: 6,
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                      }}
                      labelFormatter={(v) => fmtTimeShort(v / 1000)}
                    />
                    <Line
                      type="monotone" dataKey="risk"
                      stroke="var(--sev-critical)" strokeWidth={2}
                      dot={false} isAnimationActive={false} name="Risk"
                    />
                    <Line
                      type="monotone" dataKey="drift"
                      stroke="var(--sev-elevated)" strokeWidth={1.5}
                      dot={false} isAnimationActive={false} name="Drift ×100"
                    />
                    <Line
                      type="monotone" dataKey="ml"
                      stroke="var(--info)" strokeWidth={1.5}
                      dot={false} isAnimationActive={false} name="ML ×100"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Event history */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Event History</span>
              <span className="panel-sub">{events.length} in buffer</span>
            </div>
            <div className="event-feed">
              {events.length === 0 ? (
                <div className="empty">
                  <span className="empty-icon">◌</span>
                  Events appear here as they stream in.
                </div>
              ) : (
                events.map((e, i) => <EventRow key={e.id + i} event={e} />)
              )}
            </div>
          </div>
        </div>

        <div className="col gap-4">
          {/* Incident */}
          {incident && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Linked Incident</span>
                <SeverityBadge status={incident.severity} />
              </div>
              <div className="kv">
                <span className="kv-key">Incident ID</span>
                <span className="kv-val">{incident.id}</span>

                <span className="kv-key">Detected</span>
                <span className="kv-val">{fmtRelative(incident.detected_at)}</span>

                <span className="kv-key">Risk</span>
                <span className="kv-val">{incident.risk_score.toFixed(0)}</span>

                <span className="kv-key">Drift</span>
                <span className="kv-val">{incident.drift_score.toFixed(3)}</span>

                <span className="kv-key">Status</span>
                <span className="kv-val">{incident.status}</span>
              </div>
            </div>
          )}

          {/* Contributors */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Risk Contributors</span>
              <span className="panel-sub">{contributors.length}</span>
            </div>
            {contributors.length === 0 ? (
              <div className="empty" style={{ padding: 20 }}>
                No contributors — session is behaving normally.
              </div>
            ) : (
              <div className="contrib-list">
                {contributors.map((c, i) => {
                  const cls = /drift/i.test(c)
                    ? 'drift'
                    : /ml|isolation/i.test(c)
                    ? 'ml'
                    : 'risk';
                  return (
                    <div key={i} className={`contrib-item ${cls}`}>
                      {c}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Security Actions</span>
            </div>
            <div className="col gap-2">
              {session.response === 'ALLOW' && (
                <div className="contrib-item">✅ Session allowed — no action required</div>
              )}
              {session.response === 'MONITOR' && (
                <div className="contrib-item drift">👁 Monitoring increased</div>
              )}
              {session.response === 'VERIFY' && (
                <div className="contrib-item drift">🔒 Re-verification required</div>
              )}
              {session.response === 'RESTRICT' && (
                <>
                  <div className="contrib-item risk">⛔ Sensitive operations restricted</div>
                  <div className="contrib-item risk">🚩 Flagged for analyst review</div>
                </>
              )}
            </div>
          </div>

          {/* Devices / Locations seen */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Session Footprint</span>
            </div>
            <div className="kv">
              <span className="kv-key">Current Device</span>
              <span className="kv-val">{session.device}</span>

              <span className="kv-key">Current Location</span>
              <span className="kv-val">{session.location}</span>

              <span className="kv-key">Device Changes</span>
              <span className="kv-val">{session.device_changes}</span>

              <span className="kv-key">Location Changes</span>
              <span className="kv-val">{session.location_changes}</span>

              <span className="kv-key">Unique Endpoints</span>
              <span className="kv-val">{session.unique_endpoints}</span>

              <span className="kv-key">Last Seen</span>
              <span className="kv-val">{fmtRelative(session.last_seen)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
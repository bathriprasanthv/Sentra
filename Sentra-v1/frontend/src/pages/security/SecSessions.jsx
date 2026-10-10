import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useWs } from '../../ws/WsProvider';
import { PageHeader } from '../../components/PageHeader';
import { SeverityBadge } from '../../components/SeverityBadge';
import { LiveBadge } from '../../components/LiveBadge';
import { fmtDrift, fmtDuration, fmtML, fmtRPM, fmtRelative, shortId } from '../../lib/format';

const FILTERS = ['ALL', 'NORMAL', 'SUSPICIOUS', 'ELEVATED', 'CRITICAL'];

export default function SecSessions() {
  const nav = useNavigate();
  const { subscribe, connected } = useWs();
  const [sessions, setSessions] = useState({});
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    (async () => {
      try {
        const s = await api.listSessions();
        const map = {};
        s.forEach((x) => (map[x.id] = x));
        setSessions(map);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'hello') {
        const map = {};
        (msg.sessions || []).forEach((x) => (map[x.id] = x));
        setSessions(map);
      } else if (msg.type === 'session_update') {
        setSessions((prev) => ({ ...prev, [msg.session.id]: msg.session }));
      }
    });
  }, [subscribe]);

  const list = useMemo(() => {
    const arr = Object.values(sessions).sort((a, b) => b.risk_score - a.risk_score);
    return filter === 'ALL' ? arr : arr.filter((s) => s.status === filter);
  }, [sessions, filter]);

  const counts = useMemo(() => {
    const c = { ALL: 0, NORMAL: 0, SUSPICIOUS: 0, ELEVATED: 0, CRITICAL: 0 };
    Object.values(sessions).forEach((s) => {
      c.ALL++;
      if (c[s.status] != null) c[s.status]++;
    });
    return c;
  }, [sessions]);

  return (
    <div>
      <PageHeader
        title="Live Sessions"
        sub="Every active session under continuous monitoring"
        right={<LiveBadge on={connected} label={connected ? 'Live' : 'Offline'} />}
      />

      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
            <span className="count">{counts[f]}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <span className="empty-icon">◌</span>
            No sessions match this filter.
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Session</th>
                <th>User</th>
                <th>Device</th>
                <th>Location</th>
                <th className="t-right">Age</th>
                <th className="t-right">RPM</th>
                <th className="t-right">Failed</th>
                <th className="t-right">Sensitive</th>
                <th className="t-right">Drift</th>
                <th className="t-right">ML</th>
                <th className="t-right">Risk</th>
                <th>Status</th>
                <th>Response</th>
                <th className="t-right">Last Event</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr
                  key={s.id}
                  className="clickable"
                  onClick={() => nav(`/security/sessions/${s.id}`)}
                >
                  <td className="mono">{shortId(s.id, 14)}</td>
                  <td>{s.user}</td>
                  <td className="mono">{s.device}</td>
                  <td className="mono">{s.location}</td>
                  <td className="t-right mono">{fmtDuration(s.age_seconds)}</td>
                  <td className="t-right mono">{fmtRPM(s.requests_per_minute)}</td>
                  <td className="t-right mono">{s.failed_requests}</td>
                  <td className="t-right mono">{s.sensitive_requests}</td>
                  <td className="t-right mono">{fmtDrift(s.drift_score)}</td>
                  <td className="t-right mono">{fmtML(s.ml_anomaly_score)}</td>
                  <td className="t-right mono" style={{ color: 'var(--sev-' + s.status.toLowerCase() + ')' }}>
                    <b>{s.risk_score.toFixed(0)}</b>
                  </td>
                  <td><SeverityBadge status={s.status} /></td>
                  <td className="mono" style={{ color: 'var(--tx-2)' }}>
                    {s.response}
                  </td>
                  <td className="t-right mono" style={{ color: 'var(--tx-3)' }}>
                    {fmtRelative(s.last_seen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
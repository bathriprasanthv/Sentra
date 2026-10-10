import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useWs } from '../../ws/WsProvider';
import { PageHeader } from '../../components/PageHeader';
import { SeverityBadge, IncidentBadge } from '../../components/SeverityBadge';
import { LiveBadge } from '../../components/LiveBadge';
import { fmtRelative, shortId } from '../../lib/format';

const FILTERS = ['ALL', 'OPEN', 'REVIEWED', 'RESOLVED'];

export default function SecIncidents() {
  const nav = useNavigate();
  const { subscribe, connected } = useWs();
  const [incidents, setIncidents] = useState({});
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    (async () => {
      try {
        const list = await api.listIncidents();
        const map = {};
        list.forEach((i) => (map[i.id] = i));
        setIncidents(map);
      } catch (e) { console.error(e); }
    })();
  }, []);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'hello') {
        const map = {};
        (msg.incidents || []).forEach((i) => (map[i.id] = i));
        setIncidents(map);
      } else if (msg.type === 'incident_update') {
        setIncidents((prev) => ({ ...prev, [msg.incident.id]: msg.incident }));
      }
    });
  }, [subscribe]);

  const list = useMemo(() => {
    const arr = Object.values(incidents).sort((a, b) => b.detected_at - a.detected_at);
    return filter === 'ALL' ? arr : arr.filter((i) => i.status === filter);
  }, [incidents, filter]);

  const counts = useMemo(() => {
    const c = { ALL: 0, OPEN: 0, REVIEWED: 0, RESOLVED: 0 };
    Object.values(incidents).forEach((i) => {
      c.ALL++;
      if (c[i.status] != null) c[i.status]++;
    });
    return c;
  }, [incidents]);

  return (
    <div>
      <PageHeader
        title="Incidents"
        sub="Detected security incidents and their response actions"
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
            No incidents in this view. Run a scenario in the Security Lab to generate one.
          </div>
        </div>
      ) : (
        <div className="incident-list">
          {list.map((inc) => (
            <div key={inc.id} className={`incident-card ${inc.severity.toLowerCase()}`}>
              <div className="incident-head">
                <div className="incident-head-left">
                  <span className="incident-id">{inc.id}</span>
                  <SeverityBadge status={inc.severity} />
                  <IncidentBadge status={inc.status} />
                </div>
                <div className="row center gap-2">
                  <button
                    className="btn ghost small"
                    onClick={() => nav(`/security/sessions/${inc.session_id}`)}
                  >
                    Investigate
                  </button>
                  {inc.status === 'OPEN' && (
                    <button
                      className="btn small"
                      onClick={() => {
                        setIncidents((prev) => ({
                          ...prev,
                          [inc.id]: { ...prev[inc.id], status: 'REVIEWED' },
                        }));
                      }}
                    >
                      Mark reviewed
                    </button>
                  )}
                  {inc.status !== 'RESOLVED' && (
                    <button
                      className="btn primary small"
                      onClick={() => {
                        setIncidents((prev) => ({
                          ...prev,
                          [inc.id]: { ...prev[inc.id], status: 'RESOLVED' },
                        }));
                      }}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>

              <div className="incident-body">
                <div className="incident-stat">
                  <span className="incident-stat-label">Session</span>
                  <span className="incident-stat-value">{shortId(inc.session_id, 14)}</span>
                </div>
                <div className="incident-stat">
                  <span className="incident-stat-label">User</span>
                  <span className="incident-stat-value">{inc.user}</span>
                </div>
                <div className="incident-stat">
                  <span className="incident-stat-label">Risk Score</span>
                  <span className="incident-stat-value">{inc.risk_score.toFixed(0)}</span>
                </div>
                <div className="incident-stat">
                  <span className="incident-stat-label">Drift</span>
                  <span className="incident-stat-value">{inc.drift_score.toFixed(3)}</span>
                </div>
                <div className="incident-stat">
                  <span className="incident-stat-label">Detected</span>
                  <span className="incident-stat-value">{fmtRelative(inc.detected_at)}</span>
                </div>
              </div>

              {inc.actions_taken?.length > 0 && (
                <div className="incident-actions">
                  {inc.actions_taken.map((a, i) => (
                    <span key={i} className="incident-action">{a}</span>
                  ))}
                </div>
              )}

              {inc.indicators?.length > 0 && (
                <div className="incident-indicators">
                  {inc.indicators.slice(0, 6).map((ind, i) => (
                    <div key={i} className="incident-indicator">{ind}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
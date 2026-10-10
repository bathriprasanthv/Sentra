import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useWs } from '../../ws/WsProvider';
import { PageHeader } from '../../components/PageHeader';
import { Metric } from '../../components/Metric';
import { SeverityBadge } from '../../components/SeverityBadge';
import { EventRow } from '../../components/EventRow';
import { LiveBadge } from '../../components/LiveBadge';
import { fmtDrift, fmtML, fmtRPM, fmtRelative, shortId } from '../../lib/format';

const SEVERITIES = ['NORMAL', 'SUSPICIOUS', 'ELEVATED', 'CRITICAL'];

export default function SecDashboard() {
  const nav = useNavigate();
  const { subscribe, connected } = useWs();

  const [sessions, setSessions] = useState({});     // id -> session
  const [incidents, setIncidents] = useState({});   // id -> incident
  const [events, setEvents] = useState([]);         // recent events list

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const [s, i] = await Promise.all([api.listSessions(), api.listIncidents()]);
        const smap = {};
        s.forEach((x) => (smap[x.id] = x));
        const imap = {};
        i.forEach((x) => (imap[x.id] = x));
        setSessions(smap);
        setIncidents(imap);
      } catch (e) {
        console.error('[SecDashboard] initial load failed', e);
      }
    })();
  }, []);

  // Subscribe to live updates
  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (msg.type === 'hello') {
        const smap = {};
        (msg.sessions || []).forEach((x) => (smap[x.id] = x));
        const imap = {};
        (msg.incidents || []).forEach((x) => (imap[x.id] = x));
        setSessions(smap);
        setIncidents(imap);
      } else if (msg.type === 'session_update') {
        setSessions((prev) => ({ ...prev, [msg.session.id]: msg.session }));
      } else if (msg.type === 'raw_event') {
        setEvents((prev) => [msg.event, ...prev].slice(0, 200));
      } else if (msg.type === 'incident_update') {
        setIncidents((prev) => ({ ...prev, [msg.incident.id]: msg.incident }));
      }
    });
    return unsub;
  }, [subscribe]);

  const sessionList = useMemo(() => Object.values(sessions), [sessions]);
  const incidentList = useMemo(
    () => Object.values(incidents).sort((a, b) => b.detected_at - a.detected_at),
    [incidents]
  );

  const counts = useMemo(() => {
    const c = { NORMAL: 0, SUSPICIOUS: 0, ELEVATED: 0, CRITICAL: 0 };
    sessionList.forEach((s) => { if (c[s.status] != null) c[s.status]++; });
    return c;
  }, [sessionList]);

  const avgRisk = useMemo(() => {
    if (!sessionList.length) return 0;
    return sessionList.reduce((sum, s) => sum + s.risk_score, 0) / sessionList.length;
  }, [sessionList]);

  const avgDrift = useMemo(() => {
    if (!sessionList.length) return 0;
    return sessionList.reduce((sum, s) => sum + s.drift_score, 0) / sessionList.length;
  }, [sessionList]);

  const threatLevel = useMemo(() => {
    if (counts.CRITICAL > 0) return 'CRITICAL';
    if (counts.ELEVATED > 0) return 'ELEVATED';
    if (counts.SUSPICIOUS > 0) return 'SUSPICIOUS';
    return 'NORMAL';
  }, [counts]);

  const topRisky = useMemo(
    () => [...sessionList].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5),
    [sessionList]
  );

  const openIncidents = useMemo(
    () => incidentList.filter((i) => i.status === 'OPEN'),
    [incidentList]
  );

  return (
    <div>
      <PageHeader
        title="Security Overview"
        sub="Continuous session security at a glance"
        right={
          <>
            <LiveBadge on={connected} label={connected ? 'Live' : 'Offline'} />
            <button className="btn ghost small" onClick={() => api.reset().catch(() => {})}>
              Reset
            </button>
          </>
        }
      />

      {/* Metrics row */}
      <div className="metric-grid" style={{ marginBottom: 20 }}>
        <Metric
          label="Active Sessions"
          value={sessionList.length}
          sub={`${openIncidents.length} open incidents`}
          tone="accent"
        />
        <Metric
          label="Threat Level"
          value={threatLevel}
          sub={`${counts.CRITICAL} critical · ${counts.ELEVATED} elevated`}
          tone={threatLevel.toLowerCase()}
          size="sm"
        />
        <Metric
          label="Avg Risk"
          value={avgRisk.toFixed(1)}
          sub="across all sessions"
          tone={avgRisk >= 60 ? 'critical' : avgRisk >= 30 ? 'elevated' : 'normal'}
        />
        <Metric
          label="Avg Drift"
          value={fmtDrift(avgDrift)}
          sub="behavioral deviation"
          tone={avgDrift >= 0.4 ? 'elevated' : 'normal'}
        />
      </div>

      {/* Severity breakdown */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <span className="panel-title">Severity Distribution</span>
          <span className="panel-sub">{sessionList.length} sessions</span>
        </div>
        <div className="threat-bar">
          {SEVERITIES.map((sev) => (
            <div
              key={sev}
              className={`threat-seg ${counts[sev] > 0 ? sev.toLowerCase() : 'off'}`}
              style={{ flex: Math.max(counts[sev], 1) }}
              title={`${sev}: ${counts[sev]}`}
            />
          ))}
        </div>
        <div className="row gap-4" style={{ marginTop: 12, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          {SEVERITIES.map((sev) => (
            <span key={sev} className="row center gap-2">
              <SeverityBadge status={sev} />
              <span className="text-dim">{counts[sev]}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Two-column: top risky + recent events */}
      <div className="sec-row cols-2-1">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Top Risky Sessions</span>
            <button
              className="btn ghost small"
              onClick={() => nav('/security/sessions')}
            >
              View all
            </button>
          </div>

          {topRisky.length === 0 ? (
            <div className="empty">
              <span className="empty-icon">◌</span>
              No active sessions. Start the demo app or run a scenario in the Security Lab.
            </div>
          ) : (
            <div className="table-wrap" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>User</th>
                    <th className="t-right">RPM</th>
                    <th className="t-right">Risk</th>
                    <th className="t-right">Drift</th>
                    <th className="t-right">ML</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topRisky.map((s) => (
                    <tr
                      key={s.id}
                      className="clickable"
                      onClick={() => nav(`/security/sessions/${s.id}`)}
                    >
                      <td className="mono">{shortId(s.id, 14)}</td>
                      <td>{s.user}</td>
                      <td className="t-right mono">{fmtRPM(s.requests_per_minute)}</td>
                      <td className="t-right mono" style={{ color: 'var(--sev-' + s.status.toLowerCase() + ')' }}>
                        {s.risk_score.toFixed(0)}
                      </td>
                      <td className="t-right mono">{fmtDrift(s.drift_score)}</td>
                      <td className="t-right mono">{fmtML(s.ml_anomaly_score)}</td>
                      <td><SeverityBadge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Live Events</span>
            <LiveBadge on={connected} label={connected ? 'Live' : 'Offline'} />
          </div>
          <div className="event-feed compact">
            {events.length === 0 ? (
              <div className="empty">
                <span className="empty-icon">◌</span>
                Waiting for events…
              </div>
            ) : (
              events.slice(0, 60).map((e, i) => <EventRow key={e.id + i} event={e} />)
            )}
          </div>
        </div>
      </div>

      {/* Recent incidents */}
      {incidentList.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Recent Incidents</span>
            <button className="btn ghost small" onClick={() => nav('/security/incidents')}>
              View all
            </button>
          </div>
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Session</th>
                  <th>Severity</th>
                  <th className="t-right">Risk</th>
                  <th>Detected</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {incidentList.slice(0, 5).map((inc) => (
                  <tr
                    key={inc.id}
                    className="clickable"
                    onClick={() => nav(`/security/sessions/${inc.session_id}`)}
                  >
                    <td className="mono">{inc.id}</td>
                    <td className="mono">{shortId(inc.session_id, 14)}</td>
                    <td><SeverityBadge status={inc.severity} /></td>
                    <td className="t-right mono">{inc.risk_score.toFixed(0)}</td>
                    <td className="mono">{fmtRelative(inc.detected_at)}</td>
                    <td><SeverityBadge status={inc.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
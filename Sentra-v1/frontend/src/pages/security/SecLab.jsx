import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { SeverityBadge } from '../../components/SeverityBadge';
import { LiveBadge } from '../../components/LiveBadge';
import { useWs } from '../../ws/WsProvider';

const SEV_TONE = {
  info: 'NORMAL',
  medium: 'SUSPICIOUS',
  high: 'ELEVATED',
  critical: 'CRITICAL',
};

export default function SecLab() {
  const nav = useNavigate();
  const { connected } = useWs();
  const [scenarios, setScenarios] = useState([]);
  const [running, setRunning] = useState(null);   // scenario key
  const [speed, setSpeed] = useState(1.0);
  const [result, setResult] = useState(null);
  const [log, setLog] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.listScenarios();
        setScenarios(list);
      } catch (e) { console.error(e); }
    })();
  }, []);

  function pushLog(line) {
    setLog((prev) => [`[${new Date().toLocaleTimeString('en-GB', { hour12: false })}] ${line}`, ...prev].slice(0, 30));
  }

  async function runScenario(key) {
    if (running) return;
    setRunning(key);
    setResult(null);
    pushLog(`Launching scenario: ${key}`);
    try {
      const r = await api.runScenario(key, speed);
      setResult(r);
      pushLog(`Completed: ${r.label} → ${r.final_status} (risk ${r.final_risk})`);
    } catch (e) {
      pushLog(`Error: ${e.message}`);
    } finally {
      setRunning(null);
    }
  }

  async function resetAll() {
    pushLog('Resetting demo state…');
    try {
      await api.reset();
      pushLog('Reset complete.');
      setResult(null);
    } catch (e) {
      pushLog(`Error: ${e.message}`);
    }
  }

  return (
    <div>
      <PageHeader
        title="Security Lab"
        sub="Controlled attack simulations against the local demo session"
        right={
          <>
            <LiveBadge on={connected} label={connected ? 'Live' : 'Offline'} />
            <button className="btn danger small" onClick={resetAll} disabled={!!running}>
              Reset
            </button>
          </>
        }
      />

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <span className="panel-title">Simulation Speed</span>
          <span className="panel-sub">
            Each step is delayed per the scenario · speed {speed.toFixed(1)}×
          </span>
        </div>
        <div className="row center gap-2" style={{ flexWrap: 'wrap' }}>
          {[0.5, 1.0, 2.0, 4.0].map((s) => (
            <button
              key={s}
              className={`filter-chip ${speed === s ? 'active' : ''}`}
              onClick={() => setSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="lab-grid">
        {scenarios.map((sc) => {
          const isRunning = running === sc.key;
          const disabled = !!running && !isRunning;
          return (
            <div
              key={sc.key}
              className={`lab-card ${isRunning ? 'running' : ''} ${disabled ? 'disabled' : ''}`}
            >
              <div className="lab-card-head">
                <div>
                  <div className="lab-card-title">{sc.label}</div>
                  <div className="lab-card-key">{sc.key}</div>
                </div>
                <SeverityBadge status={SEV_TONE[sc.severity] || 'NORMAL'} />
              </div>
              <button
                className={`btn ${sc.severity === 'critical' ? 'danger' : 'primary'}`}
                onClick={() => runScenario(sc.key)}
                disabled={!!running}
              >
                {isRunning ? 'Running…' : 'Launch'}
              </button>
            </div>
          );
        })}
      </div>

      {result && (
        <div className="lab-result">
          <div className="panel-header" style={{ marginBottom: 0 }}>
            <span className="panel-title">Last Result — {result.label}</span>
            <button
              className="btn ghost small"
              onClick={() => nav(`/security/sessions/${result.session_id}`)}
            >
              Open session →
            </button>
          </div>
          <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
            <div className="incident-stat">
              <span className="incident-stat-label">Status</span>
              <span className="incident-stat-value">{result.final_status}</span>
            </div>
            <div className="incident-stat">
              <span className="incident-stat-label">Risk</span>
              <span className="incident-stat-value">{result.final_risk.toFixed(0)}</span>
            </div>
            <div className="incident-stat">
              <span className="incident-stat-label">Drift</span>
              <span className="incident-stat-value">{result.final_drift.toFixed(3)}</span>
            </div>
            <div className="incident-stat">
              <span className="incident-stat-label">ML</span>
              <span className="incident-stat-value">{result.final_ml.toFixed(3)}</span>
            </div>
            <div className="incident-stat">
              <span className="incident-stat-label">Steps</span>
              <span className="incident-stat-value">{result.steps}</span>
            </div>
            <div className="incident-stat">
              <span className="incident-stat-label">Elapsed</span>
              <span className="incident-stat-value">{result.elapsed_seconds.toFixed(1)}s</span>
            </div>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <span className="panel-title">Lab Console</span>
        </div>
        <div
          className="mono"
          style={{
            maxHeight: 200,
            overflowY: 'auto',
            fontSize: 11.5,
            color: 'var(--tx-1)',
            background: 'var(--bg-2)',
            padding: '10px 14px',
            borderRadius: 'var(--radius)',
          }}
        >
          {log.length === 0
            ? 'Awaiting actions…'
            : log.map((l, i) => (
              <div key={i} style={{ padding: '2px 0' }}>{l}</div>
            ))}
        </div>
      </div>
    </div>
  );
}
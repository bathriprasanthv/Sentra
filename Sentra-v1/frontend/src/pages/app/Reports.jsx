import { api } from '../../api/client';
import { DemoHeader } from '../../components/DemoHeader';
import { getDemoSession } from '../../lib/demoSession';
import { usePageTelemetry } from '../../lib/usePageTelemetry';

const REPORTS = [
  { id: 'RPT-2041', title: 'Q3 Revenue Summary',     meta: 'CSV · 2.1 MB · 2025-10-01' },
  { id: 'RPT-2042', title: 'Active Users Weekly',    meta: 'PDF · 890 KB · 2025-10-03' },
  { id: 'RPT-2043', title: 'Security Audit Trail',   meta: 'JSON · 5.4 MB · 2025-10-04' },
  { id: 'RPT-2044', title: 'Billing Reconciliation', meta: 'XLSX · 1.2 MB · 2025-10-04' },
];

export default function Reports() {
  usePageTelemetry('/reports');

  async function openReport(r) {
    const sess = getDemoSession();
    if (!sess) return;
    await api.sendEvent(sess.id, `/reports/${r.id}`, 'REPORT_ACCESS');
  }

  async function exportAll() {
    const sess = getDemoSession();
    if (!sess) return;
    await api.sendEvent(sess.id, '/reports/export', 'SENSITIVE_ACTION');
  }

  return (
    <div className="app-page">
      <DemoHeader />
      <div className="app-hero">
        <div>
          <h2>Reports</h2>
          <p>Sensitive business analytics</p>
        </div>
        <button className="btn" onClick={exportAll}>Export all</button>
      </div>

      <div className="app-grid">
        {REPORTS.map((r) => (
          <div className="report-card" key={r.id} onClick={() => openReport(r)}>
            <div className="report-title">{r.title}</div>
            <div className="report-meta">{r.id} · {r.meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
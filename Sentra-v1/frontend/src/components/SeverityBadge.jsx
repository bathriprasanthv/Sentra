export function SeverityBadge({ status, children }) {
  const s = (status || 'INFO').toUpperCase();
  return <span className={`badge ${s}`}>{children || s}</span>;
}

export function IncidentBadge({ status }) {
  const s = (status || 'OPEN').toUpperCase();
  return <span className={`badge ${s}`}>{s}</span>;
}

export function StatusPill({ status }) {
  return <SeverityBadge status={status} />;
}
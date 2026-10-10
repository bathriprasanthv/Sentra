export function Metric({ label, value, sub, tone = '', size = '' }) {
  return (
    <div className={`metric ${tone}`}>
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${size}`}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}
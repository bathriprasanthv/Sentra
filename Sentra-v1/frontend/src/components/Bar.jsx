
export function Bar({ value, max = 1, tone }) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  const cls = tone || 'accent';
  return (
    <div className="bar">
      <div className={`bar-fill ${cls}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
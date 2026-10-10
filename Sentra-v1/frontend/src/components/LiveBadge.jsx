export function LiveBadge({ on = true, label }) {
  return (
    <span className={`live-badge ${on ? '' : 'off'}`}>
      <span className="dot" />
      {label || (on ? 'LIVE' : 'OFFLINE')}
    </span>
  );
}
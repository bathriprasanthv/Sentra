export function StatusDot({ state = 'offline', pulse = false, label, style }) {
  const cls = ['dot', state, pulse ? 'pulse' : ''].filter(Boolean).join(' ');
  return (
    <span className="row center gap-2" style={{ display: 'inline-flex', ...style }}>
      <span className={cls} />
      {label && <span>{label}</span>}
    </span>
  );
}
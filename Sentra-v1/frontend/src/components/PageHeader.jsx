export function PageHeader({ title, sub, right }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {right && <div className="row center gap-2">{right}</div>}
    </div>
  );
}
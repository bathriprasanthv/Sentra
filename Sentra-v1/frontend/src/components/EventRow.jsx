import { fmtTimeShort } from '../lib/format';

function eventClass(type) {
  const t = (type || '').toUpperCase();
  if (t.includes('FAIL')) return 'fail';
  if (t.includes('SENSITIVE') || t.includes('ADMIN')) return 'sensitive';
  if (t.includes('API')) return 'admin';
  return '';
}

function statusClass(code) {
  if (code >= 500) return 'err';
  if (code >= 400) return 'err';
  if (code >= 300) return 'warn';
  return 'ok';
}

export function EventRow({ event }) {
  return (
    <div className="event-row">
      <span className="event-ts">{fmtTimeShort(event.timestamp)}</span>
      <span className={`event-type ${eventClass(event.event_type)}`}>
        {event.event_type}
      </span>
      <span className="event-endpoint">
        {event.method} {event.endpoint}
      </span>
      <span className={`event-status ${statusClass(event.status_code)}`}>
        {event.status_code}
      </span>
    </div>
  );
}
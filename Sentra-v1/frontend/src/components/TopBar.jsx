import { useLocation } from 'react-router-dom';
import { useWs } from '../ws/WsProvider';
import { useHealth } from '../lib/useHealth';
import { StatusDot } from './StatusDot';
import { LiveBadge } from './LiveBadge';

const TITLES = {
  '/security/dashboard':  'Security Overview',
  '/security/sessions':   'Live Sessions',
  '/security/incidents':  'Incidents',
  '/security/lab':        'Security Lab',
  '/security/events':     'Event Stream',
  '/app/dashboard':       'Demo · Dashboard',
  '/app/profile':         'Demo · Profile',
  '/app/products':        'Demo · Products',
  '/app/reports':         'Demo · Reports',
  '/app/settings':        'Demo · Settings',
};

export function TopBar() {
  const { pathname } = useLocation();
  const { connected } = useWs();
  const health = useHealth(4000);

  // Match dynamic session detail route
  const title = TITLES[pathname]
    || (pathname.startsWith('/security/sessions/') ? 'Session Investigation' : 'Sentra');

  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-divider" />

      <LiveBadge on={connected} label={connected ? 'Live' : 'Offline'} />

      <div className="topbar-spacer" />

      <div className="topbar-health">
        <div className="health-item">
          <StatusDot state={health.backend ? 'online' : 'error'} />
          <span>Backend</span>
        </div>
        <div className="health-item">
          <StatusDot state={health.ml ? 'online' : 'warn'} />
          <span>ML</span>
        </div>
        <div className="health-item">
          <StatusDot state={connected ? 'online' : 'offline'} />
          <span>WS</span>
        </div>
      </div>
    </header>
  );
}
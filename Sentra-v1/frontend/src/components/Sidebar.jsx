import { NavLink } from 'react-router-dom';
import { Icon } from './Icons';

const DEMO_LINKS = [
  { to: '/app/dashboard', label: 'Dashboard', icon: Icon.Grid },
  { to: '/app/profile',   label: 'Profile',   icon: Icon.User },
  { to: '/app/products',  label: 'Products',  icon: Icon.Box },
  { to: '/app/reports',   label: 'Reports',   icon: Icon.Chart },
  { to: '/app/settings',  label: 'Settings',  icon: Icon.Cog },
];

const SECURITY_LINKS = [
  { to: '/security/dashboard', label: 'Overview',   icon: Icon.Shield },
  { to: '/security/sessions',  label: 'Sessions',   icon: Icon.Activity },
  { to: '/security/incidents', label: 'Incidents',  icon: Icon.Alert },
  { to: '/security/lab',       label: 'Security Lab', icon: Icon.Beaker },
  { to: '/security/events',    label: 'Event Stream', icon: Icon.List },
];

function NavGroup({ title, links }) {
  return (
    <div className="nav-group">
      <div className="nav-group-title">{title}</div>
      {links.map(({ to, label, icon: Ico }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="ico"><Ico /></span>
          <span>{label}</span>
        </NavLink>
      ))}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/sentra.svg" alt="Sentra" />
        <div className="sidebar-brand-text">
          <strong>SENTRA</strong>
          <span>Session Security</span>
        </div>
      </div>

      <div className="sidebar-scroll">
        <NavGroup title="Security Center" links={SECURITY_LINKS} />
        <NavGroup title="Demo Application" links={DEMO_LINKS} />
      </div>

      <div className="sidebar-footer">
        <span className="dot accent pulse" />
        <span>Monitor Active</span>
      </div>
    </aside>
  );
}
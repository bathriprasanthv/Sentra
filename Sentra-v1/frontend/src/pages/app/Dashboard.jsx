import { useNavigate } from 'react-router-dom';
import { DemoHeader } from '../../components/DemoHeader';
import { Icon } from '../../components/Icons';
import { usePageTelemetry } from '../../lib/usePageTelemetry';

const TILES = [
  { path: '/app/profile',  title: 'Profile',  desc: 'View and edit your account',   icon: Icon.User },
  { path: '/app/products', title: 'Products', desc: 'Browse product catalog',        icon: Icon.Box },
  { path: '/app/reports',  title: 'Reports',  desc: 'Generate and export reports',   icon: Icon.Chart },
  { path: '/app/settings', title: 'Settings', desc: 'Account and security settings', icon: Icon.Cog },
];

export default function Dashboard() {
  const nav = useNavigate();
  usePageTelemetry('/dashboard');

  return (
    <div className="app-page">
      <DemoHeader />

      <div className="app-hero">
        <div>
          <h2>Welcome back, Alice</h2>
          <p>This is the demo application. Every page you visit is observed by Sentra.</p>
        </div>
      </div>

      <div className="app-grid">
        {TILES.map((t) => (
          <button key={t.path} className="app-tile" onClick={() => nav(t.path)}>
            <div className="app-tile-icon"><t.icon /></div>
            <div className="app-tile-body">
              <span className="app-tile-title">{t.title}</span>
              <span className="app-tile-desc">{t.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
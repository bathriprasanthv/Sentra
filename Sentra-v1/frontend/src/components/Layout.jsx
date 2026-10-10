import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function Layout() {
  return (
    <div className="shell">
      <Sidebar />
      <TopBar />
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
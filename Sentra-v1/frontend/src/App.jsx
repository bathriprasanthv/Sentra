import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WsProvider } from './ws/WsProvider';
import { Layout } from './components/Layout';

// Demo app
import Login from './pages/app/Login';
import Dashboard from './pages/app/Dashboard';
import Profile from './pages/app/Profile';
import Products from './pages/app/Products';
import Reports from './pages/app/Reports';
import Settings from './pages/app/Settings';

// Security Center
import SecDashboard from './pages/security/SecDashboard';
import SecSessions from './pages/security/SecSessions';
import SecSessionDetail from './pages/security/SecSessionDetail';
import SecIncidents from './pages/security/SecIncidents';
import SecLab from './pages/security/SecLab';
import SecEvents from './pages/security/SecEvents';

export default function App() {
  return (
    <WsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/security/dashboard" replace />} />
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            {/* Demo application */}
            <Route path="/app/dashboard" element={<Dashboard />} />
            <Route path="/app/profile"   element={<Profile />} />
            <Route path="/app/products"  element={<Products />} />
            <Route path="/app/reports"   element={<Reports />} />
            <Route path="/app/settings"  element={<Settings />} />

            {/* Security Center */}
            <Route path="/security/dashboard"    element={<SecDashboard />} />
            <Route path="/security/sessions"     element={<SecSessions />} />
            <Route path="/security/sessions/:id" element={<SecSessionDetail />} />
            <Route path="/security/incidents"    element={<SecIncidents />} />
            <Route path="/security/lab"          element={<SecLab />} />
            <Route path="/security/events"       element={<SecEvents />} />
          </Route>

          <Route path="*" element={<Navigate to="/security/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </WsProvider>
  );
}
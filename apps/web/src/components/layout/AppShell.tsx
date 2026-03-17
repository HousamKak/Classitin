import { Outlet, Navigate, useLocation } from 'react-router';
import { Navbar } from './Navbar';
import { ConnectionBanner } from '@/components/common/ConnectionBanner';
import { useAuthStore } from '@/stores/authStore';

export function AppShell() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  const isSession = location.pathname.includes('/session');

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`flex h-screen flex-col ${isSession ? 'session-dark' : ''}`}>
      <Navbar />
      {isSession && <ConnectionBanner />}
      <main className={`flex-1 overflow-auto ${isSession ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <Outlet />
      </main>
    </div>
  );
}

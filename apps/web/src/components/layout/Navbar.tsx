import { LogOut, GraduationCap, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate, useLocation } from 'react-router';

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isInSession = location.pathname.includes('/session');
  const prefix = user?.role === 'TEACHER' ? '/t' : '/s';

  return (
    <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-xl px-4 md:px-6 py-2.5 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isInSession && (
            <button
              onClick={() => navigate(`${prefix}/rooms`)}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <button onClick={() => navigate(`${prefix}/rooms`)} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight hidden sm:block">Classitin</span>
          </button>
          {user && (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
              user.role === 'TEACHER'
                ? 'bg-primary-50 text-primary-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}>
              {user.role}
            </span>
          )}
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1.5">
              <div className="h-6 w-6 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-700">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">{user.displayName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

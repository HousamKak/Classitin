import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Login } from './Login';
import { Register } from './Register';
import { RoomList } from './RoomList';
import { RoomDetail } from './RoomDetail';
import { TeacherDashboard } from './TeacherDashboard';
import { StudentView } from './StudentView';
import { JoinRoom } from './JoinRoom';
import { NotFound } from './NotFound';
import { useAuthStore } from '@/stores/authStore';

function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'TEACHER' ? '/t/rooms' : '/s/rooms'} replace />;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<AppShell />}>
          <Route path="/" element={<HomeRedirect />} />

          {/* Teacher routes */}
          <Route path="/t/rooms" element={<RoomList />} />
          <Route path="/t/rooms/:roomId" element={<RoomDetail />} />
          <Route path="/t/rooms/:roomId/session" element={<TeacherDashboard />} />

          {/* Student routes */}
          <Route path="/s/rooms" element={<RoomList />} />
          <Route path="/s/rooms/join" element={<JoinRoom />} />
          <Route path="/s/rooms/:roomId" element={<RoomDetail />} />
          <Route path="/s/rooms/:roomId/session" element={<StudentView />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

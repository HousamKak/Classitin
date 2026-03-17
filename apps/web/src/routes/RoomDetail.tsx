import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Play, ArrowRight, Hash, Copy, Users, Radio } from 'lucide-react';
import { toast } from 'sonner';

export function RoomDetail() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, currentSession, fetchRoom, startSession } = useRoomStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (roomId) fetchRoom(roomId);
  }, [roomId, fetchRoom]);

  if (!currentRoom) return <LoadingSpinner />;

  const isTeacher = user?.role === 'TEACHER';
  const prefix = isTeacher ? '/t' : '/s';

  const handleStartSession = async () => {
    if (!roomId) return;
    await startSession(roomId);
    navigate(`${prefix}/rooms/${roomId}/session`);
  };

  const handleJoinSession = () => {
    navigate(`${prefix}/rooms/${roomId}/session`);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(currentRoom.joinCode);
    toast.success('Join code copied!');
  };

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      {/* Room header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{currentRoom.name}</h2>
        {currentRoom.description && (
          <p className="mt-2 text-gray-500 leading-relaxed">{currentRoom.description}</p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={copyCode}
            className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-4 py-2 text-sm font-mono text-gray-700 hover:bg-gray-100 transition-colors group"
          >
            <Hash className="h-3.5 w-3.5 text-gray-400" />
            {currentRoom.joinCode}
            <Copy className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </button>
          <span className="flex items-center gap-1.5 text-sm text-gray-400">
            <Users className="h-4 w-4" />
            {currentRoom.maxStudents} max students
          </span>
        </div>
      </div>

      {/* Session card */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {currentSession?.status === 'ACTIVE' ? (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <Radio className="h-5 w-5 text-emerald-500" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-live-pulse" />
              </div>
              <div>
                <span className="text-sm font-semibold text-emerald-700">Session is Live</span>
                {currentSession.title && (
                  <span className="ml-2 text-sm text-gray-400">- {currentSession.title}</span>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              {isTeacher ? 'Your session is active. Click below to open the dashboard.' : 'Click below to join the live session.'}
            </p>
            <button
              onClick={handleJoinSession}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-primary-600/25 hover:bg-primary-700 transition-all active:scale-[0.98]"
            >
              {isTeacher ? 'Open Dashboard' : 'Join Session'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : isTeacher ? (
          <div className="p-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 mb-4">
              <Play className="h-7 w-7 text-primary-600 ml-0.5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to start?</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              Start a session to begin monitoring your students' screens in real time.
            </p>
            <button
              onClick={handleStartSession}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 transition-all active:scale-[0.98]"
            >
              <Play className="h-4 w-4" />
              Start Session
            </button>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
              <Radio className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No active session</h3>
            <p className="text-sm text-gray-500">
              Waiting for the teacher to start a session. Check back soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

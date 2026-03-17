import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Hash, Users, ArrowRight, X } from 'lucide-react';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function RoomList() {
  const { rooms, isLoading, fetchRooms, createRoom, joinRoom } = useRoomStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const room = await createRoom({ name: roomName, description: roomDesc || undefined });
      setShowCreate(false);
      setRoomName('');
      setRoomDesc('');
      navigate(`/t/rooms/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await joinRoom(joinCode.toUpperCase());
      setShowJoin(false);
      setJoinCode('');
      fetchRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    }
  };

  const prefix = user?.role === 'TEACHER' ? '/t' : '/s';
  const isTeacher = user?.role === 'TEACHER';

  if (isLoading && rooms.length === 0) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isTeacher ? 'Your Classrooms' : 'My Classes'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {isTeacher ? 'Manage and monitor your classes' : 'View and join your enrolled classes'}
          </p>
        </div>
        <div className="flex gap-2">
          {isTeacher ? (
            <button
              onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); }}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-600/25 hover:bg-primary-700 transition-all active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> New Room
            </button>
          ) : (
            <button
              onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-600/25 hover:bg-primary-700 transition-all active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Join Room
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Create a new room</h3>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              placeholder="Room name (e.g., Digital Art 101)"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={roomDesc}
              onChange={(e) => setRoomDesc(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <div className="flex gap-2 pt-1">
              <button type="submit" className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors">
                Create Room
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join modal */}
      {showJoin && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Join a room</h3>
            <button onClick={() => setShowJoin(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              placeholder="Enter 6-character code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              maxLength={6}
              required
              autoFocus
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-lg font-mono uppercase tracking-[0.3em] placeholder:tracking-normal placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <div className="flex gap-2 pt-1">
              <button type="submit" className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors">
                Join Room
              </button>
              <button type="button" onClick={() => setShowJoin(false)} className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Room grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => navigate(`${prefix}/rooms/${room.id}`)}
            className="group relative rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:shadow-lg hover:shadow-gray-200/60 hover:border-primary-200 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{room.name}</h3>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary-500 transition-all group-hover:translate-x-0.5" />
            </div>
            {room.description && (
              <p className="mt-2 text-sm text-gray-500 line-clamp-2 leading-relaxed">{room.description}</p>
            )}
            <div className="mt-4 flex items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-mono text-gray-500">
                <Hash className="h-3 w-3" />
                {room.joinCode}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <Users className="h-3 w-3" />
                {room.maxStudents} max
              </span>
            </div>
          </button>
        ))}
        {rooms.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              {isTeacher ? 'No rooms yet' : 'No classes yet'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {isTeacher ? 'Create your first classroom to get started' : 'Ask your teacher for a join code'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useRoomStore } from '@/stores/roomStore';

export function JoinRoom() {
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const { joinRoom } = useRoomStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await joinRoom(joinCode.toUpperCase());
      navigate('/s/rooms');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    }
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <h2 className="mb-4 text-xl font-bold">Join a Room</h2>
      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Enter 6-character code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          maxLength={6}
          className="w-full rounded-lg border px-4 py-3 text-center text-2xl font-mono uppercase tracking-widest"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-green-600 py-3 font-medium text-white hover:bg-green-700"
        >
          Join Room
        </button>
      </form>
    </div>
  );
}

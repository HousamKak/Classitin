import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useSocket } from '@/hooks/useSocket';
import { useMediasoup } from '@/hooks/useMediasoup';
import { usePresence } from '@/hooks/usePresence';
import { useStudentStreams } from '@/hooks/useStudentStreams';
import { useRoomStore } from '@/stores/roomStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useAuthStore } from '@/stores/authStore';
import { getSocket } from '@/services/socket';
import { consumeStream } from '@/services/mediasoupClient';
import { SessionControls } from '@/components/teacher/SessionControls';
import { TeacherScreenShare } from '@/components/teacher/TeacherScreenShare';
import { StudentGrid } from '@/components/teacher/StudentGrid';
import { StudentFocusView } from '@/components/teacher/StudentFocusView';
import { ClassRoster } from '@/components/teacher/ClassRoster';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { Transport } from 'mediasoup-client/types';
import { Users } from 'lucide-react';

export function TeacherDashboard() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { isConnected } = useSocket();
  const { currentRoom, currentSession, fetchRoom, endSession } = useRoomStore();
  const user = useAuthStore((s) => s.user);
  const focusedStudentId = useMediaStore((s) => s.focusedStudentId);
  const addConsumer = useMediaStore((s) => s.addConsumer);
  const clearAll = useMediaStore((s) => s.clearAll);

  const sessionId = currentSession?.id ?? null;
  const { initDevice, getSendTransport, getRecvTransport, cleanup: cleanupMedia } = useMediasoup(sessionId ?? '');
  const { participants, initRoster } = usePresence(sessionId);

  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const [recvTransport, setRecvTransport] = useState<Transport | null>(null);
  const [joined, setJoined] = useState(false);
  const [showRoster, setShowRoster] = useState(true);

  const { focusStudent, unfocusStudent, subscribeToProducer } = useStudentStreams(sessionId, recvTransport);

  useEffect(() => {
    if (roomId) fetchRoom(roomId);
  }, [roomId, fetchRoom]);

  useEffect(() => {
    if (!isConnected || !sessionId || !roomId || joined) return;

    const socket = getSocket();
    socket.emit('room:join', { roomId, sessionId }, async (response: Record<string, unknown>) => {
      if (response.error) {
        console.error('Failed to join room:', response.error);
        return;
      }

      await initDevice(response.rtpCapabilities as Parameters<typeof initDevice>[0]);
      initRoster(response.roster as Parameters<typeof initRoster>[0]);

      const transport = await getRecvTransport();
      recvTransportRef.current = transport;
      setRecvTransport(transport);
      console.log('[TeacherDashboard] recvTransport created, id:', transport.id);

      // Consume existing producers directly with the transport variable
      // (can't use subscribeToProducer here because recvTransport state hasn't updated yet)
      const producers = response.existingProducers as Array<{ producerId: string; userId: string }>;
      console.log('[TeacherDashboard] existingProducers:', producers);
      for (const p of producers) {
        if (p.userId !== user?.id) {
          try {
            console.log('[TeacherDashboard] consuming existing producer:', p.producerId, 'from user:', p.userId);
            const consumer = await consumeStream(transport, sessionId!, p.producerId);
            addConsumer({
              consumerId: consumer.id,
              producerId: p.producerId,
              userId: p.userId,
              track: consumer.track,
              kind: consumer.kind,
              paused: false,
            });
          } catch (err) {
            console.error('Failed to consume existing producer:', err);
          }
        }
      }

      setJoined(true);
    });

    return () => {
      if (joined) {
        socket.emit('room:leave', { roomId, sessionId });
        cleanupMedia();
        clearAll();
        setJoined(false);
        setRecvTransport(null);
      }
    };
  }, [isConnected, sessionId, roomId, joined]);

  const handleEndSession = useCallback(async () => {
    if (!roomId || !sessionId) return;
    await endSession(roomId, sessionId);
    navigate(`/t/rooms/${roomId}`);
  }, [roomId, sessionId, endSession, navigate]);

  const handleStartSession = useCallback(async () => {
    if (!roomId) return;
    const { startSession } = useRoomStore.getState();
    await startSession(roomId);
  }, [roomId]);

  const getSendTransportCb = useCallback(async () => {
    if (sendTransportRef.current) return sendTransportRef.current;
    const transport = await getSendTransport();
    sendTransportRef.current = transport;
    return transport;
  }, [getSendTransport]);

  const focusedParticipant = focusedStudentId ? participants.get(focusedStudentId) : null;
  const studentCount = Array.from(participants.values()).filter(p => p.role === 'STUDENT').length;

  if (!currentRoom) return <LoadingSpinner />;

  return (
    <div className="flex h-[calc(100vh-49px)]">
      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 md:px-6 py-3">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{currentRoom.name}</h2>
              <p className="text-xs text-gray-400">Teacher Dashboard</p>
            </div>
            {joined && (
              <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500">
                <Users className="h-3 w-3" />
                {studentCount} student{studentCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <SessionControls
              session={currentSession}
              onStart={handleStartSession}
              onEnd={handleEndSession}
            />
            {joined && (
              <button
                onClick={() => setShowRoster(!showRoster)}
                className={`hidden md:flex items-center justify-center h-9 w-9 rounded-xl transition-colors ${
                  showRoster ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:bg-gray-100'
                }`}
                title="Toggle roster"
              >
                <Users className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {currentSession?.status === 'ACTIVE' && joined ? (
          <div className="flex-1 overflow-auto p-4 md:p-6 space-y-5">
            {/* Teacher screen share */}
            <TeacherScreenShare
              sendTransport={sendTransportRef.current}
              getSendTransport={getSendTransportCb}
            />

            {/* Focused student overlay */}
            {focusedParticipant && (
              <StudentFocusView
                userId={focusedStudentId!}
                displayName={focusedParticipant.displayName}
                onClose={unfocusStudent}
              />
            )}

            {/* Student grid */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Student Screens
              </h3>
              <StudentGrid participants={participants} onFocusStudent={focusStudent} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
                <Users className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500">
                {currentSession ? 'Connecting to session...' : 'Start a session to begin monitoring'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar roster */}
      {currentSession?.status === 'ACTIVE' && joined && showRoster && (
        <div className="hidden md:block w-64 overflow-auto border-l border-gray-100 bg-white">
          <ClassRoster participants={participants} onFocusStudent={focusStudent} />
        </div>
      )}
    </div>
  );
}

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
import { VoiceControls } from '@/components/teacher/VoiceControls';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ChatPanel } from '@/components/common/ChatPanel';
import { useAudio } from '@/hooks/useAudio';
import { useVoiceEvents } from '@/hooks/useVoiceEvents';
import { useChat } from '@/hooks/useChat';
import type { Transport } from 'mediasoup-client/types';
import { Users, MessageCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

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
  const joinedRef = useRef(false);
  const joiningRef = useRef(false);
  const [showRoster, setShowRoster] = useState(true);

  const { focusStudent, unfocusStudent, subscribeToProducer } = useStudentStreams(sessionId, recvTransport);
  const { playAudioTrack, stopAudioTrack } = useVoiceEvents(sessionId);

  // Auto-play audio consumers through speakers
  const consumers = useMediaStore((s) => s.consumers);
  useEffect(() => {
    for (const [consumerId, info] of consumers) {
      if (info.kind === 'audio') {
        playAudioTrack(consumerId, info.track);
      }
    }
  }, [consumers, playAudioTrack]);

  useEffect(() => {
    if (roomId) fetchRoom(roomId);
  }, [roomId, fetchRoom]);

  useEffect(() => {
    if (!isConnected || !sessionId || !roomId) return;
    if (joinedRef.current || joiningRef.current) return;

    joiningRef.current = true;
    const socket = getSocket();
    socket.emit('room:join', { roomId, sessionId }, async (response: Record<string, unknown>) => {
      if (response.error) {
        console.error('Failed to join room:', response.error);
        joiningRef.current = false;
        return;
      }

      try {
        await initDevice(response.rtpCapabilities as Parameters<typeof initDevice>[0]);
        initRoster(response.roster as Parameters<typeof initRoster>[0]);

        const transport = await getRecvTransport();
        recvTransportRef.current = transport;
        setRecvTransport(transport);

        const producers = response.existingProducers as Array<{ producerId: string; userId: string }>;
        for (const p of producers) {
          if (p.userId !== user?.id) {
            try {
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

        joinedRef.current = true;
        joiningRef.current = false;
        setJoined(true);
      } catch (err) {
        console.error('Failed to setup session:', err);
        joiningRef.current = false;
      }
    });
  }, [isConnected, sessionId, roomId]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (joinedRef.current) {
        const socket = getSocket();
        socket.emit('room:leave', { roomId, sessionId });
        cleanupMedia();
        clearAll();
        sendTransportRef.current = null;
        recvTransportRef.current = null;
        setRecvTransport(null);
      }
      joinedRef.current = false;
      joiningRef.current = false;
      setJoined(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const {
    voiceMode,
    isMuted,
    privateCallUserId,
    startBroadcast,
    startPrivateCall,
    stopVoice,
    toggleMute,
  } = useAudio({ getSendTransport: getSendTransportCb });

  const { messages, unreadCount, isOpen: chatOpen, sendMessage, toggleOpen: toggleChat } = useChat(sessionId);
  const [showChat, setShowChat] = useState(false);

  const focusedParticipant = focusedStudentId ? participants.get(focusedStudentId) : null;
  const privateCallParticipant = privateCallUserId ? participants.get(privateCallUserId) : null;
  const studentCount = Array.from(participants.values()).filter(p => p.role === 'STUDENT').length;

  if (!currentRoom) return <LoadingSpinner />;

  return (
    <div className="flex h-[calc(100vh-49px)]">
      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm px-4 md:px-6 py-3">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-100">{currentRoom.name}</h2>
              <p className="text-xs text-gray-500">Teacher Dashboard</p>
            </div>
            {joined && (
              <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-gray-400">
                <Users className="h-3 w-3" />
                {studentCount} student{studentCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {joined && (
              <VoiceControls
                voiceMode={voiceMode}
                isMuted={isMuted}
                privateCallUserId={privateCallUserId}
                privateCallName={privateCallParticipant?.displayName}
                onStartBroadcast={startBroadcast}
                onStartPrivateCall={startPrivateCall}
                onStop={stopVoice}
                onToggleMute={toggleMute}
              />
            )}
            <SessionControls
              session={currentSession}
              onStart={handleStartSession}
              onEnd={handleEndSession}
            />
            {joined && (
              <>
                <button
                  onClick={() => { setShowChat(!showChat); if (!showChat) toggleChat(); }}
                  className={`relative flex items-center justify-center h-10 w-10 rounded-xl transition-colors ${
                    showChat ? 'bg-primary-500/15 text-primary-400' : 'text-gray-500 hover:bg-gray-800'
                  }`}
                  title="Toggle chat"
                >
                  <MessageCircle className="h-4.5 w-4.5" />
                  {unreadCount > 0 && !showChat && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[9px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowRoster(!showRoster)}
                  className={`hidden md:flex items-center justify-center h-10 w-10 rounded-xl transition-colors ${
                    showRoster ? 'bg-primary-500/15 text-primary-400' : 'text-gray-500 hover:bg-gray-800'
                  }`}
                  title="Toggle roster"
                >
                  <Users className="h-4.5 w-4.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {currentSession?.status === 'ACTIVE' && joined ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 overflow-auto p-4 md:p-6 space-y-5"
          >
            {/* Teacher screen share */}
            <TeacherScreenShare
              sendTransport={sendTransportRef.current}
              getSendTransport={getSendTransportCb}
            />

            {/* Focused student overlay */}
            <AnimatePresence>
              {focusedParticipant && (
                <StudentFocusView
                  userId={focusedStudentId!}
                  displayName={focusedParticipant.displayName}
                  onClose={unfocusStudent}
                  onStartPrivateCall={startPrivateCall}
                  isInCall={voiceMode !== 'off'}
                />
              )}
            </AnimatePresence>

            {/* Student grid */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Student Screens
              </h3>
              <StudentGrid participants={participants} onFocusStudent={focusStudent} />
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 border border-gray-800 mb-4">
                <Users className="h-7 w-7 text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-400">
                {currentSession ? 'Connecting to session...' : 'Start a session to begin monitoring'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {currentSession?.status === 'ACTIVE' && joined && showChat && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden border-l border-gray-800 bg-gray-900/80 backdrop-blur-sm"
          >
            <ChatPanel messages={messages} onSend={sendMessage} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar roster */}
      <AnimatePresence>
        {currentSession?.status === 'ACTIVE' && joined && showRoster && !showChat && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="hidden md:block overflow-auto border-l border-gray-800 bg-gray-900/80 backdrop-blur-sm"
          >
            <ClassRoster participants={participants} onFocusStudent={focusStudent} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

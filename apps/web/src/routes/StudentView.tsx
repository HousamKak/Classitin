import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useSocket } from '@/hooks/useSocket';
import { useMediasoup } from '@/hooks/useMediasoup';
import { usePresence } from '@/hooks/usePresence';
import { useRoomStore } from '@/stores/roomStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useAuthStore } from '@/stores/authStore';
import { getSocket } from '@/services/socket';
import { consumeStream } from '@/services/mediasoupClient';
import { TeacherStreamViewer } from '@/components/student/TeacherStreamViewer';
import { ScreenShareToggle } from '@/components/student/ScreenShareToggle';
import { SharingStatusIndicator } from '@/components/student/SharingStatusIndicator';
import { StudentSessionPanel } from '@/components/student/StudentSessionPanel';
import { AudioIndicator } from '@/components/student/AudioIndicator';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ChatPanel } from '@/components/common/ChatPanel';
import { useVoiceEvents } from '@/hooks/useVoiceEvents';
import { useChat } from '@/hooks/useChat';
import type { Transport } from 'mediasoup-client/types';
import type { PresenceStatus } from '@classitin/shared';
import { Radio, Monitor, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
  typeof navigator !== 'undefined' ? navigator.userAgent : ''
);

export function StudentView() {
  const { roomId } = useParams<{ roomId: string }>();
  const { isConnected } = useSocket();
  const { currentRoom, currentSession, fetchRoom } = useRoomStore();
  const user = useAuthStore((s) => s.user);
  const addConsumer = useMediaStore((s) => s.addConsumer);
  const clearAll = useMediaStore((s) => s.clearAll);

  const sessionId = currentSession?.id ?? null;
  const { initDevice, getSendTransport, getRecvTransport, cleanup: cleanupMedia } = useMediasoup(sessionId ?? '');
  const { participants, updateMyStatus, initRoster } = usePresence(sessionId);

  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const [joined, setJoined] = useState(false);
  const [myStatus, setMyStatus] = useState<PresenceStatus>('ONLINE');
  const { isBroadcasting, inPrivateCall, privateCallFromName, playAudioTrack } = useVoiceEvents(sessionId);
  const { messages, unreadCount, isOpen: chatOpen, sendMessage, toggleOpen: toggleChat } = useChat(sessionId);
  const [showChat, setShowChat] = useState(false);

  // Auto-play audio consumers through speakers
  const consumers = useMediaStore((s) => s.consumers);
  useEffect(() => {
    for (const [consumerId, info] of consumers) {
      if (info.kind === 'audio') {
        playAudioTrack(consumerId, info.track);
      }
    }
  }, [consumers, playAudioTrack]);

  const teacherUserId = Array.from(participants.values()).find(
    (p) => p.role === 'TEACHER'
  )?.userId ?? null;

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

      try {
        const sendTransport = await getSendTransport();
        sendTransportRef.current = sendTransport;
      } catch (err) {
        console.warn('Failed to pre-create send transport:', err);
      }

      const producers = response.existingProducers as Array<{ producerId: string; userId: string; kind: string }>;
      for (const p of producers) {
        if (p.userId !== user?.id) {
          try {
            const consumer = await consumeStream(transport, sessionId, p.producerId);
            addConsumer({
              consumerId: consumer.id,
              producerId: p.producerId,
              userId: p.userId,
              track: consumer.track,
              kind: consumer.kind,
              paused: false,
            });
          } catch (err) {
            console.error('Failed to consume:', err);
          }
        }
      }

      socket.on('stream:started', async (payload: { userId: string; producerId: string; kind: string }) => {
        if (payload.userId !== user?.id && recvTransportRef.current) {
          try {
            const consumer = await consumeStream(recvTransportRef.current, sessionId, payload.producerId);
            addConsumer({
              consumerId: consumer.id,
              producerId: payload.producerId,
              userId: payload.userId,
              track: consumer.track,
              kind: consumer.kind,
              paused: false,
            });
          } catch (err) {
            console.error('Failed to consume new stream:', err);
          }
        }
      });

      setJoined(true);
    });

    return () => {
      if (joined) {
        socket.emit('room:leave', { roomId, sessionId });
        socket.off('stream:started');
        cleanupMedia();
        clearAll();
        sendTransportRef.current = null;
        recvTransportRef.current = null;
        setJoined(false);
      }
    };
  }, [isConnected, sessionId, roomId, joined]);

  const getSendTransportCb = useCallback(async () => {
    if (sendTransportRef.current) return sendTransportRef.current;
    const transport = await getSendTransport();
    sendTransportRef.current = transport;
    return transport;
  }, [getSendTransport]);

  const handleStatusChange = useCallback((status: PresenceStatus) => {
    setMyStatus(status);
    updateMyStatus(status);
  }, [updateMyStatus]);

  if (!currentRoom) return <LoadingSpinner />;

  if (!currentSession || currentSession.status !== 'ACTIVE') {
    return (
      <div className="flex h-[calc(100vh-49px)] items-center justify-center">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 border border-gray-800 mb-4">
            <Radio className="h-7 w-7 text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-400">Waiting for teacher to start session</p>
          <p className="mt-1 text-xs text-gray-600">You'll be able to join once it begins</p>
        </div>
      </div>
    );
  }

  if (!joined) return <LoadingSpinner />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-[calc(100vh-49px)] flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Radio className="h-4 w-4 text-emerald-500" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-live-pulse" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-100">{currentRoom.name}</h2>
            <p className="text-xs text-gray-500">{currentSession.title ?? 'Live Session'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StudentSessionPanel currentStatus={myStatus} onStatusChange={handleStatusChange} />
          {!isMobile && (
            <ScreenShareToggle
              sendTransport={sendTransportRef.current}
              getSendTransport={getSendTransportCb}
            />
          )}
          <button
            onClick={() => { setShowChat(!showChat); if (!showChat) toggleChat(); }}
            className={`relative flex items-center justify-center h-9 w-9 rounded-xl transition-colors ${
              showChat ? 'bg-primary-500/15 text-primary-400' : 'text-gray-500 hover:bg-gray-800'
            }`}
            title="Toggle chat"
          >
            <MessageCircle className="h-4 w-4" />
            {unreadCount > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content + chat */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
          {/* Mobile info */}
          {isMobile && (
            <div className="flex items-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-2.5">
              <Monitor className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-300">Screen sharing requires a desktop browser. You can still watch the teacher's screen here.</p>
            </div>
          )}
          {/* Voice indicators */}
          <AudioIndicator
            isBroadcasting={isBroadcasting}
            inPrivateCall={inPrivateCall}
            callerName={privateCallFromName ?? undefined}
          />

          {/* Sharing indicator */}
          <SharingStatusIndicator />

          {/* Teacher's screen */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="h-4 w-4 text-gray-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Teacher's Screen</h3>
            </div>
            <TeacherStreamViewer teacherUserId={teacherUserId} />
          </div>
        </div>

        {/* Chat panel */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="hidden md:block overflow-hidden border-l border-gray-800 bg-gray-900/80 backdrop-blur-sm"
            >
              <ChatPanel messages={messages} onSend={sendMessage} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

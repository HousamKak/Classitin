import { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useRoomStore } from '@/stores/roomStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useSocket } from '@/hooks/useSocket';
import { useMediasoup } from '@/hooks/useMediasoup';
import { usePresence } from '@/hooks/usePresence';
import { useScreenCapture } from '@/hooks/useScreenCapture';
import { getSocket } from '@/services/socket';
import { consumeStream, produceScreen, closeProducer } from '@/services/mediasoupClient';
import { RTCVideoView } from '@/components/RTCVideoView';
import { ScreenShareButton } from '@/components/ScreenShareButton';
import { colors, spacing, fontSize, borderRadius } from '@/theme';
import type { PresenceStatus } from '@classitin/shared';
import type { Transport } from 'mediasoup-client/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentSession'>;

export function StudentSessionScreen({ route, navigation }: Props) {
  const { roomId } = route.params;
  const { isConnected } = useSocket();
  const { currentRoom, currentSession, fetchRoom } = useRoomStore();
  const user = useAuthStore((s) => s.user);
  const consumers = useMediaStore((s) => s.consumers);
  const localScreenTrack = useMediaStore((s) => s.localScreenTrack);
  const localProducerId = useMediaStore((s) => s.localProducerId);
  const setLocalScreenTrack = useMediaStore((s) => s.setLocalScreenTrack);
  const setLocalProducerId = useMediaStore((s) => s.setLocalProducerId);
  const addConsumer = useMediaStore((s) => s.addConsumer);
  const removeConsumersByUserId = useMediaStore((s) => s.removeConsumersByUserId);
  const clearAll = useMediaStore((s) => s.clearAll);

  const sessionId = currentSession?.id ?? null;
  const { initDevice, getSendTransport, getRecvTransport, cleanup: cleanupMedia } = useMediasoup(sessionId ?? '');
  const { participants, updateMyStatus, initRoster } = usePresence(sessionId);
  const { isCapturing, startCapture, stopCapture } = useScreenCapture();

  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const [joined, setJoined] = useState(false);
  const [myStatus, setMyStatus] = useState<PresenceStatus>('ONLINE');
  const [isShareLoading, setIsShareLoading] = useState(false);

  // Find teacher's userId from participants
  const teacherUserId = Array.from(participants.values()).find(
    (p) => p.role === 'TEACHER'
  )?.userId ?? null;

  // Find teacher's video track from consumers
  let teacherTrack: MediaStreamTrack | null = null;
  if (teacherUserId) {
    for (const info of consumers.values()) {
      if (info.userId === teacherUserId && info.kind === 'video') {
        teacherTrack = info.track;
        break;
      }
    }
  }

  useEffect(() => {
    if (roomId) fetchRoom(roomId);
  }, [roomId, fetchRoom]);

  // Track join state with ref to avoid stale closure issues
  const joinedRef = useRef(false);
  const joiningRef = useRef(false);

  // Join session on mount, leave on unmount
  useEffect(() => {
    if (!isConnected || !sessionId || !roomId) return;
    if (joinedRef.current || joiningRef.current) return; // Already joined or in progress

    joiningRef.current = true;
    const socket = getSocket();

    console.log('[StudentSession] Emitting room:join', { roomId, sessionId });

    socket.emit('room:join', { roomId, sessionId }, async (response: Record<string, unknown>) => {
      if (response.error) {
        console.error('[StudentSession] room:join error:', response.error);
        joiningRef.current = false;
        Alert.alert('Error', response.error as string);
        return;
      }

      try {
        await initDevice(response.rtpCapabilities as any);
        initRoster(response.roster as any);

        const transport = await getRecvTransport();
        recvTransportRef.current = transport;

        // Pre-create send transport for screen sharing
        try {
          const sendT = await getSendTransport();
          sendTransportRef.current = sendT;
        } catch (err) {
          console.warn('Failed to pre-create send transport:', err);
        }

        // Consume existing producers
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

        joinedRef.current = true;
        joiningRef.current = false;
        setJoined(true);
        console.log('[StudentSession] Joined successfully');
      } catch (err) {
        console.error('[StudentSession] Error during join setup:', err);
        joiningRef.current = false;
        Alert.alert('Error', 'Failed to set up session. Try going back and rejoining.');
      }
    });
    // No cleanup here — cleanup is handled by the unmount effect below
  }, [isConnected, sessionId, roomId]);

  // Separate unmount-only cleanup
  useEffect(() => {
    return () => {
      if (joinedRef.current) {
        const socket = getSocket();
        socket.emit('room:leave', { roomId, sessionId });
        cleanupMedia();
        clearAll();
        sendTransportRef.current = null;
        recvTransportRef.current = null;
      }
      joinedRef.current = false;
      joiningRef.current = false;
      setJoined(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stream event listeners — separate from join to avoid stale closures
  useEffect(() => {
    if (!joined || !sessionId) return;
    const socket = getSocket();

    const handleStreamStarted = async (payload: { userId: string; producerId: string; kind: string }) => {
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
    };

    const handleStreamStopped = (payload: { userId: string; producerId: string }) => {
      removeConsumersByUserId(payload.userId);
    };

    socket.on('stream:started', handleStreamStarted);
    socket.on('stream:stopped', handleStreamStopped);

    return () => {
      socket.off('stream:started', handleStreamStarted);
      socket.off('stream:stopped', handleStreamStopped);
    };
  }, [joined, sessionId, user?.id, addConsumer, removeConsumersByUserId]);

  const handleStartShare = useCallback(async () => {
    setIsShareLoading(true);
    try {
      const track = await startCapture();
      if (!track) return;
      setLocalScreenTrack(track);

      const transport = sendTransportRef.current ?? await getSendTransport();
      sendTransportRef.current = transport;
      console.log('[StudentSession] Producing screen, transport id:', transport.id, 'track:', track.id, 'readyState:', track.readyState);
      const producer = await produceScreen(transport, track, false);
      console.log('[StudentSession] Producer created!', 'producerId:', producer.id, 'kind:', producer.kind, 'paused:', producer.paused);
      setLocalProducerId(producer.id);

      track.addEventListener('ended', () => {
        if (producer.id) closeProducer(producer.id);
        setLocalScreenTrack(null);
        setLocalProducerId(null);
      });
    } catch (err) {
      console.error('Failed to start screen share:', err);
      Alert.alert('Error', 'Failed to start screen sharing');
    } finally {
      setIsShareLoading(false);
    }
  }, [getSendTransport, startCapture, setLocalScreenTrack, setLocalProducerId]);

  const handleStopShare = useCallback(() => {
    stopCapture();
    if (localProducerId) closeProducer(localProducerId);
    setLocalScreenTrack(null);
    setLocalProducerId(null);
  }, [stopCapture, localProducerId, setLocalScreenTrack, setLocalProducerId]);

  const handleStatusChange = useCallback((status: PresenceStatus) => {
    setMyStatus(status);
    updateMyStatus(status);
  }, [updateMyStatus]);

  if (!currentRoom || !currentSession) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  if (!joined) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Joining session...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <View>
            <Text style={styles.headerTitle}>{currentRoom.name}</Text>
            <Text style={styles.headerSubtitle}>{currentSession.title ?? 'Live Session'}</Text>
          </View>
        </View>
      </View>

      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusButtons}>
          <TouchableOpacity
            style={[styles.statusButton, myStatus === 'ONLINE' && styles.statusButtonActiveGreen]}
            onPress={() => handleStatusChange('ONLINE')}
          >
            <Text style={[styles.statusButtonText, myStatus === 'ONLINE' && styles.statusButtonTextActiveGreen]}>
              Online
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusButton, myStatus === 'NEEDS_HELP' && styles.statusButtonActiveAmber]}
            onPress={() => handleStatusChange('NEEDS_HELP')}
          >
            <Text style={[styles.statusButtonText, myStatus === 'NEEDS_HELP' && styles.statusButtonTextActiveAmber]}>
              Need Help
            </Text>
          </TouchableOpacity>
        </View>
        <ScreenShareButton
          isCapturing={isCapturing}
          isLoading={isShareLoading}
          onStart={handleStartShare}
          onStop={handleStopShare}
        />
      </View>

      {/* Sharing indicator */}
      {localScreenTrack && (
        <View style={styles.sharingBanner}>
          <View style={styles.sharingDot} />
          <Text style={styles.sharingText}>You are sharing your screen</Text>
        </View>
      )}

      {/* Teacher's screen */}
      <View style={styles.teacherSection}>
        <Text style={styles.sectionLabel}>TEACHER'S SCREEN</Text>
        <View style={styles.teacherVideo}>
          {teacherTrack ? (
            <RTCVideoView track={teacherTrack} objectFit="contain" />
          ) : (
            <View style={styles.teacherPlaceholder}>
              <Text style={styles.placeholderText}>
                {teacherUserId ? 'Teacher is not sharing their screen' : 'Waiting for teacher...'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Self preview */}
      {localScreenTrack && (
        <View style={styles.selfPreviewSection}>
          <Text style={styles.sectionLabel}>YOUR SCREEN</Text>
          <View style={styles.selfPreview}>
            <RTCVideoView track={localScreenTrack} objectFit="contain" />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.gray[400] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.emerald[500],
  },
  headerTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.gray[900] },
  headerSubtitle: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  statusButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[100],
  },
  statusButtonActiveGreen: {
    backgroundColor: colors.emerald[50],
    borderWidth: 1,
    borderColor: colors.emerald[200],
  },
  statusButtonActiveAmber: {
    backgroundColor: colors.amber[50],
    borderWidth: 1,
    borderColor: colors.amber[200],
  },
  statusButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray[500],
  },
  statusButtonTextActiveGreen: {
    color: colors.emerald[700],
  },
  statusButtonTextActiveAmber: {
    color: colors.amber[700],
  },
  sharingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  sharingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emerald[500],
  },
  sharingText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary[700],
  },
  teacherSection: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.gray[400],
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  teacherVideo: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  teacherPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.gray[500],
    fontSize: fontSize.sm,
  },
  selfPreviewSection: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  selfPreview: {
    height: 100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
});

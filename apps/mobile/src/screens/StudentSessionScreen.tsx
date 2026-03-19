import { useEffect, useCallback, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Modal,
  Animated, PanResponder,
} from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useRoomStore } from '@/stores/roomStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useSocket } from '@/hooks/useSocket';
import { useMediasoup } from '@/hooks/useMediasoup';
import { usePresence } from '@/hooks/usePresence';
import { useScreenCapture } from '@/hooks/useScreenCapture';
import { useVoiceEvents } from '@/hooks/useVoiceEvents';
import { useChat } from '@/hooks/useChat';
import { useDimensions } from '@/hooks/useDimensions';
import { getSocket } from '@/services/socket';
import { consumeStream, produceScreen, closeProducer } from '@/services/mediasoupClient';
import { RTCVideoView } from '@/components/RTCVideoView';
import { ScreenShareButton } from '@/components/ScreenShareButton';
import { ConnectionBanner } from '@/components/ConnectionBanner';
import { AudioIndicator } from '@/components/AudioIndicator';
import { ChatPanel } from '@/components/ChatPanel';
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

  const { width, height, isLandscape } = useDimensions();

  // Voice events (student receives broadcast/private calls)
  const { isBroadcasting, inPrivateCall, privateCallFromName } = useVoiceEvents(sessionId);

  // Chat
  const { messages, unreadCount, isOpen: isChatOpen, sendMessage, toggleOpen: toggleChat } = useChat(sessionId);

  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const [joined, setJoined] = useState(false);
  const [myStatus, setMyStatus] = useState<PresenceStatus>('ONLINE');
  const [isShareLoading, setIsShareLoading] = useState(false);

  // Pinch-to-zoom state for teacher stream
  const scaleValue = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScale = useRef(1);
  const lastDist = useRef(0);
  const lastTranslate = useRef({ x: 0, y: 0 });

  const pinchResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        // Activate on pinch (2 fingers) or pan when zoomed
        return gs.numberActiveTouches >= 2 || (lastScale.current > 1 && Math.abs(gs.dx) > 5);
      },
      onPanResponderMove: (evt, gs) => {
        if (gs.numberActiveTouches >= 2) {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (lastDist.current > 0) {
              const pinch = dist / lastDist.current;
              const newScale = Math.min(Math.max(lastScale.current * pinch, 1), 5);
              scaleValue.setValue(newScale);
            }
            lastDist.current = dist;
          }
        } else if (lastScale.current > 1) {
          // Pan when zoomed
          translateX.setValue(lastTranslate.current.x + gs.dx);
          translateY.setValue(lastTranslate.current.y + gs.dy);
        }
      },
      onPanResponderRelease: () => {
        // @ts-ignore - _value is internal but accessible
        lastScale.current = scaleValue._value ?? 1;
        // @ts-ignore
        lastTranslate.current = { x: translateX._value ?? 0, y: translateY._value ?? 0 };
        lastDist.current = 0;

        if (lastScale.current <= 1.05) {
          // Snap back to 1x
          Animated.parallel([
            Animated.spring(scaleValue, { toValue: 1, useNativeDriver: true }),
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
          ]).start();
          lastScale.current = 1;
          lastTranslate.current = { x: 0, y: 0 };
        }
      },
    })
  ).current;

  // Double-tap to zoom
  const lastTap = useRef(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap — toggle zoom
      if (lastScale.current > 1) {
        Animated.parallel([
          Animated.spring(scaleValue, { toValue: 1, useNativeDriver: true }),
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        ]).start();
        lastScale.current = 1;
        lastTranslate.current = { x: 0, y: 0 };
      } else {
        Animated.spring(scaleValue, { toValue: 2.5, useNativeDriver: true }).start();
        lastScale.current = 2.5;
      }
    }
    lastTap.current = now;
  }, [scaleValue, translateX, translateY]);

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

  // Join session on mount
  useEffect(() => {
    if (!isConnected || !sessionId || !roomId) return;
    if (joinedRef.current || joiningRef.current) return;

    joiningRef.current = true;
    const socket = getSocket();

    socket.emit('room:join', { roomId, sessionId }, async (response: Record<string, unknown>) => {
      if (response.error) {
        joiningRef.current = false;
        Alert.alert('Error', response.error as string);
        return;
      }

      try {
        await initDevice(response.rtpCapabilities as any);
        initRoster(response.roster as any);

        const transport = await getRecvTransport();
        recvTransportRef.current = transport;

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
      } catch (err) {
        console.error('[StudentSession] Error during join setup:', err);
        joiningRef.current = false;
        Alert.alert('Error', 'Failed to set up session. Try going back and rejoining.');
      }
    });
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

  // Stream event listeners
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
      const producer = await produceScreen(transport, track, true);
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

  const handleEndVoiceCall = useCallback(() => {
    if (!sessionId) return;
    try {
      const socket = getSocket();
      socket.emit('voice:call-end', { sessionId, targetUserId: null });
    } catch {
      // ignore
    }
  }, [sessionId]);

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
      {/* Connection Banner */}
      <ConnectionBanner />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <View>
            <Text style={styles.headerTitle}>{currentRoom.name}</Text>
            <Text style={styles.headerSubtitle}>{currentSession.title ?? 'Live Session'}</Text>
          </View>
        </View>
        {/* Chat toggle */}
        <TouchableOpacity style={styles.chatButton} onPress={toggleChat} activeOpacity={0.7}>
          <Text style={styles.chatButtonText}>Chat</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
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

      {/* Audio indicator */}
      <AudioIndicator
        isBroadcasting={isBroadcasting}
        inPrivateCall={inPrivateCall}
        callerName={privateCallFromName ?? undefined}
        onEndCall={inPrivateCall ? handleEndVoiceCall : undefined}
      />

      {/* Sharing indicator */}
      {localScreenTrack && (
        <View style={styles.sharingBanner}>
          <View style={styles.sharingDot} />
          <Text style={styles.sharingText}>You are sharing your screen</Text>
        </View>
      )}

      {isLandscape ? (
        /* ============ LANDSCAPE LAYOUT ============ */
        <View style={styles.landscapeBody}>
          {/* Teacher's screen — takes most space */}
          <View style={styles.landscapeMain}>
            <Text style={styles.sectionLabel}>TEACHER'S SCREEN</Text>
            <View
              style={styles.teacherVideo}
              {...pinchResponder.panHandlers}
            >
              {teacherTrack ? (
                <Animated.View
                  style={{
                    flex: 1,
                    transform: [
                      { scale: scaleValue },
                      { translateX },
                      { translateY },
                    ],
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleDoubleTap}
                    style={{ flex: 1 }}
                  >
                    <RTCVideoView track={teacherTrack} objectFit="contain" />
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <View style={styles.teacherPlaceholder}>
                  <Text style={styles.placeholderText}>
                    {teacherUserId ? 'Teacher is not sharing' : 'Waiting for teacher...'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Side panel: self preview */}
          {localScreenTrack && (
            <View style={styles.landscapeSide}>
              <Text style={styles.sectionLabel}>YOUR SCREEN</Text>
              <View style={styles.selfPreviewLandscape}>
                <RTCVideoView track={localScreenTrack} objectFit="contain" />
              </View>
            </View>
          )}
        </View>
      ) : (
        /* ============ PORTRAIT LAYOUT ============ */
        <>
          {/* Teacher's screen — with pinch-to-zoom */}
          <View style={styles.teacherSection}>
            <View style={styles.teacherLabelRow}>
              <Text style={styles.sectionLabel}>TEACHER'S SCREEN</Text>
              <Text style={styles.zoomHint}>Pinch to zoom · Double-tap to enlarge</Text>
            </View>
            <View
              style={styles.teacherVideo}
              {...pinchResponder.panHandlers}
            >
              {teacherTrack ? (
                <Animated.View
                  style={{
                    flex: 1,
                    transform: [
                      { scale: scaleValue },
                      { translateX },
                      { translateY },
                    ],
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleDoubleTap}
                    style={{ flex: 1 }}
                  >
                    <RTCVideoView track={teacherTrack} objectFit="contain" />
                  </TouchableOpacity>
                </Animated.View>
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
        </>
      )}

      {/* Chat modal */}
      <Modal visible={isChatOpen} animationType="slide" presentationStyle="pageSheet">
        <ChatPanel
          messages={messages}
          onSend={sendMessage}
          onClose={toggleChat}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[900] },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray[900] },
  loadingText: { color: colors.gray[400] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.gray[900],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.emerald[500],
  },
  headerTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.white },
  headerSubtitle: { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 1 },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gray[800],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.gray[700],
    minHeight: 44,
  },
  chatButtonText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.gray[300] },
  unreadBadge: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadText: { fontSize: 10, fontWeight: '800', color: colors.white },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[900],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  statusButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[800],
    minHeight: 44,
    justifyContent: 'center',
  },
  statusButtonActiveGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusButtonActiveAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray[400],
  },
  statusButtonTextActiveGreen: {
    color: colors.emerald[500],
  },
  statusButtonTextActiveAmber: {
    color: colors.amber[500],
  },
  sharingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
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
    color: colors.primary[400],
  },
  teacherSection: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    justifyContent: 'center',
  },
  teacherLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  zoomHint: {
    fontSize: 10,
    color: colors.gray[600],
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.gray[500],
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  teacherVideo: {
    aspectRatio: 16 / 9,
    width: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.gray[800],
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
    borderColor: colors.gray[800],
  },
  // Landscape layout
  landscapeBody: {
    flex: 1,
    flexDirection: 'row',
  },
  landscapeMain: {
    flex: 1,
    padding: spacing.md,
  },
  landscapeSide: {
    width: '30%',
    padding: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: colors.gray[800],
  },
  selfPreviewLandscape: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.gray[800],
  },
});

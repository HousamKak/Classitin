import { useEffect, useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Dimensions, Modal,
} from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useRoomStore } from '@/stores/roomStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useSocket } from '@/hooks/useSocket';
import { useMediasoup } from '@/hooks/useMediasoup';
import { usePresence } from '@/hooks/usePresence';
import { useScreenCapture } from '@/hooks/useScreenCapture';
import { useAudio } from '@/hooks/useAudio';
import { useVoiceEvents } from '@/hooks/useVoiceEvents';
import { useChat } from '@/hooks/useChat';
import { getSocket } from '@/services/socket';
import { consumeStream, produceScreen, closeProducer, setPreferredLayers } from '@/services/mediasoupClient';
import { THUMBNAIL_LAYER, HD_LAYER } from '@classitin/shared';
import { RTCVideoView } from '@/components/RTCVideoView';
import { StudentThumbnail } from '@/components/StudentThumbnail';
import { StudentFocusView } from '@/components/StudentFocusView';
import { ScreenShareButton } from '@/components/ScreenShareButton';
import { ConnectionBanner } from '@/components/ConnectionBanner';
import { VoiceControls } from '@/components/VoiceControls';
import { ChatPanel } from '@/components/ChatPanel';
import { colors, spacing, fontSize, borderRadius } from '@/theme';
import type { Transport } from 'mediasoup-client/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherDashboard'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMBNAIL_COLS = SCREEN_WIDTH > 600 ? 3 : 2;
const THUMBNAIL_WIDTH = (SCREEN_WIDTH - spacing.xl * 2 - spacing.sm * (THUMBNAIL_COLS - 1)) / THUMBNAIL_COLS;

export function TeacherDashboardScreen({ route, navigation }: Props) {
  const { roomId } = route.params;
  const { isConnected, connectionState } = useSocket();
  const { currentRoom, currentSession, fetchRoom, endSession } = useRoomStore();
  const user = useAuthStore((s) => s.user);
  const consumers = useMediaStore((s) => s.consumers);
  const focusedStudentId = useMediaStore((s) => s.focusedStudentId);
  const setFocusedStudent = useMediaStore((s) => s.setFocusedStudent);
  const addConsumer = useMediaStore((s) => s.addConsumer);
  const removeConsumer = useMediaStore((s) => s.removeConsumer);
  const removeConsumersByUserId = useMediaStore((s) => s.removeConsumersByUserId);
  const localScreenTrack = useMediaStore((s) => s.localScreenTrack);
  const localProducerId = useMediaStore((s) => s.localProducerId);
  const setLocalScreenTrack = useMediaStore((s) => s.setLocalScreenTrack);
  const setLocalProducerId = useMediaStore((s) => s.setLocalProducerId);
  const clearAll = useMediaStore((s) => s.clearAll);

  const sessionId = currentSession?.id ?? null;
  const { initDevice, getSendTransport, getRecvTransport, cleanup: cleanupMedia } = useMediasoup(sessionId ?? '');
  const { participants, initRoster } = usePresence(sessionId);
  const { isCapturing, startCapture, stopCapture } = useScreenCapture();

  // Voice
  const { voiceMode, isMuted, privateCallUserId, startBroadcast, startPrivateCall, stopVoice, toggleMute } =
    useAudio({ getSendTransport });
  useVoiceEvents(sessionId);

  // Chat
  const { messages, unreadCount, isOpen: isChatOpen, sendMessage, toggleOpen: toggleChat } = useChat(sessionId);

  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const [joined, setJoined] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);

  useEffect(() => {
    if (roomId) fetchRoom(roomId);
  }, [roomId, fetchRoom]);

  // Join session
  useEffect(() => {
    if (!isConnected || !sessionId || !roomId || joined) return;

    const socket = getSocket();
    socket.emit('room:join', { roomId, sessionId }, async (response: Record<string, unknown>) => {
      if (response.error) {
        Alert.alert('Error', response.error as string);
        return;
      }

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

      // Listen for new streams
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

      socket.on('stream:stopped', (payload: { userId: string; producerId: string }) => {
        removeConsumersByUserId(payload.userId);
      });

      setJoined(true);
    });

    return () => {
      if (joined) {
        socket.emit('room:leave', { roomId, sessionId });
        socket.off('stream:started');
        socket.off('stream:stopped');
        cleanupMedia();
        clearAll();
        setJoined(false);
      }
    };
  }, [isConnected, sessionId, roomId, joined]);

  // Focus/unfocus layer switching
  useEffect(() => {
    if (!focusedStudentId) return;
    for (const [, info] of consumers) {
      if (info.userId === focusedStudentId && info.kind === 'video') {
        setPreferredLayers(info.consumerId, HD_LAYER.spatialLayer, HD_LAYER.temporalLayer);
      }
    }
    return () => {
      for (const [, info] of consumers) {
        if (info.userId === focusedStudentId && info.kind === 'video') {
          setPreferredLayers(info.consumerId, THUMBNAIL_LAYER.spatialLayer, THUMBNAIL_LAYER.temporalLayer);
        }
      }
    };
  }, [focusedStudentId, consumers]);

  const handleStartShare = useCallback(async () => {
    setIsShareLoading(true);
    try {
      const track = await startCapture();
      if (!track) return;
      setLocalScreenTrack(track);

      const transport = sendTransportRef.current ?? await getSendTransport();
      sendTransportRef.current = transport;
      const producer = await produceScreen(transport, track, false);
      setLocalProducerId(producer.id);

      track.addEventListener('ended', () => {
        if (producer.id) closeProducer(producer.id);
        setLocalScreenTrack(null);
        setLocalProducerId(null);
      });
    } catch (err) {
      console.error('Failed to start screen share:', err);
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

  const handleEndSession = () => {
    if (!currentSession) return;
    Alert.alert('End Session', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          stopVoice();
          await endSession(roomId, currentSession.id);
          navigation.goBack();
        },
      },
    ]);
  };

  // Build student list
  const students = Array.from(participants.values()).filter((p) => p.role === 'STUDENT');

  const getStudentTrack = (userId: string): MediaStreamTrack | null => {
    for (const [, info] of consumers) {
      if (info.userId === userId && info.kind === 'video') return info.track;
    }
    return null;
  };

  // Get focused student info
  const focusedStudent = focusedStudentId ? participants.get(focusedStudentId) : null;
  const focusedTrack = focusedStudentId ? getStudentTrack(focusedStudentId) : null;
  const focusedName = focusedStudent?.displayName ?? '';

  if (!currentRoom || !currentSession) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading session...</Text>
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
            <Text style={styles.headerSubtitle}>
              {students.length} student{students.length !== 1 ? 's' : ''} connected
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {/* Chat toggle */}
          <TouchableOpacity style={styles.chatButton} onPress={toggleChat} activeOpacity={0.7}>
            <Text style={styles.chatButtonText}>Chat</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.endSessionButton} onPress={handleEndSession}>
            <Text style={styles.endSessionText}>End</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Voice controls */}
      <View style={styles.voiceBar}>
        <VoiceControls
          voiceMode={voiceMode}
          isMuted={isMuted}
          privateCallName={
            privateCallUserId
              ? participants.get(privateCallUserId)?.displayName
              : undefined
          }
          onStartBroadcast={startBroadcast}
          onStop={stopVoice}
          onToggleMute={toggleMute}
        />
      </View>

      {/* Screen share controls */}
      <View style={styles.shareSection}>
        <Text style={styles.sectionLabel}>YOUR SCREEN</Text>
        <ScreenShareButton
          isCapturing={isCapturing}
          isLoading={isShareLoading}
          onStart={handleStartShare}
          onStop={handleStopShare}
        />
        {localScreenTrack && (
          <View style={styles.selfPreview}>
            <RTCVideoView track={localScreenTrack} objectFit="contain" />
          </View>
        )}
      </View>

      {/* Student grid */}
      <View style={styles.gridSection}>
        <Text style={styles.sectionLabel}>STUDENTS</Text>
        <FlatList
          data={students}
          keyExtractor={(item) => item.userId}
          numColumns={THUMBNAIL_COLS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => (
            <View style={{ width: THUMBNAIL_WIDTH }}>
              <StudentThumbnail
                displayName={item.displayName}
                track={getStudentTrack(item.userId)}
                status={item.status}
                isSharing={item.isSharing}
                onPress={() => setFocusedStudent(item.userId)}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyGrid}>
              <Text style={styles.emptyGridText}>Waiting for students to share their screens...</Text>
            </View>
          }
        />
      </View>

      {/* Focus view overlay */}
      {focusedStudent && (
        <StudentFocusView
          displayName={focusedName}
          track={focusedTrack}
          onClose={() => setFocusedStudent(null)}
        />
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
  endSessionButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  endSessionText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.red[500] },
  voiceBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[900],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  shareSection: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.gray[900],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.gray[500],
    letterSpacing: 1,
  },
  selfPreview: {
    height: 120,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.gray[800],
  },
  gridSection: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  gridRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  gridContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  emptyGrid: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyGridText: {
    color: colors.gray[500],
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});

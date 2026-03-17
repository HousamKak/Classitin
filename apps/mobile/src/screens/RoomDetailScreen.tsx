import { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useRoomStore } from '@/stores/roomStore';
import { useSocket } from '@/hooks/useSocket';
import { getSocket } from '@/services/socket';
import { colors, spacing, fontSize, borderRadius } from '@/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomDetail'>;

export function RoomDetailScreen({ route, navigation }: Props) {
  const { roomId } = route.params;
  const user = useAuthStore((s) => s.user);
  const { currentRoom, currentSession, fetchRoom, startSession, endSession } = useRoomStore();
  const { isConnected } = useSocket();

  const isOwner = user?.id === currentRoom?.ownerId;
  const isTeacher = user?.role === 'TEACHER';
  const hasActiveSession = currentSession?.status === 'ACTIVE';

  useEffect(() => {
    fetchRoom(roomId);
  }, [roomId, fetchRoom]);

  useEffect(() => {
    if (!isConnected) return;
    const socket = getSocket();

    const onSessionChanged = (payload: { roomId?: string }) => {
      if (!payload.roomId || payload.roomId === roomId) {
        fetchRoom(roomId);
      }
    };
    socket.on('session:started', onSessionChanged);
    socket.on('session:ended', onSessionChanged);

    return () => {
      socket.off('session:started', onSessionChanged);
      socket.off('session:ended', onSessionChanged);
    };
  }, [isConnected, roomId, fetchRoom]);

  const handleStartSession = async () => {
    try {
      await startSession(roomId);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleEndSession = async () => {
    if (!currentSession) return;
    Alert.alert('End Session', 'Are you sure you want to end this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          try {
            await endSession(roomId, currentSession.id);
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleEnterSession = () => {
    if (isTeacher) {
      navigation.navigate('TeacherDashboard', { roomId });
    } else {
      navigation.navigate('StudentSession', { roomId });
    }
  };

  if (!currentRoom) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.roomHeader}>
          <View style={styles.roomIcon}>
            <Text style={styles.roomIconText}>{currentRoom.name[0].toUpperCase()}</Text>
          </View>
          <View style={styles.roomInfo}>
            <Text style={styles.roomName}>{currentRoom.name}</Text>
            {currentRoom.description ? (
              <Text style={styles.roomDesc}>{currentRoom.description}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>Join Code</Text>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{currentRoom.joinCode}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sessionCard}>
        <Text style={styles.sectionTitle}>Session</Text>
        {hasActiveSession ? (
          <>
            <View style={styles.sessionActive}>
              <View style={styles.liveDot} />
              <Text style={styles.sessionActiveText}>
                {currentSession?.title ?? 'Live Session'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.enterButton}
              onPress={handleEnterSession}
              activeOpacity={0.8}
            >
              <Text style={styles.enterButtonText}>Enter Session</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity
                style={styles.endButton}
                onPress={handleEndSession}
                activeOpacity={0.8}
              >
                <Text style={styles.endButtonText}>End Session</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Text style={styles.noSession}>No active session</Text>
            {isOwner && (
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartSession}
                activeOpacity={0.8}
              >
                <Text style={styles.startButtonText}>Start Session</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.xl, gap: spacing.lg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.gray[400] },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.gray[100],
    gap: spacing.lg,
  },
  roomHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  roomIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomIconText: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.primary[700] },
  roomInfo: { flex: 1 },
  roomName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.gray[900] },
  roomDesc: { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 2 },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  codeLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.gray[500] },
  codeBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  codeText: { fontSize: fontSize.md, fontWeight: '700', color: colors.gray[800], fontFamily: 'monospace' },
  sessionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.gray[100],
    gap: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.gray[400], textTransform: 'uppercase', letterSpacing: 1 },
  sessionActive: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.emerald[500] },
  sessionActiveText: { fontSize: fontSize.md, fontWeight: '600', color: colors.emerald[700] },
  noSession: { fontSize: fontSize.md, color: colors.gray[400] },
  enterButton: {
    backgroundColor: colors.primary[600],
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  enterButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
  startButton: {
    backgroundColor: colors.emerald[600],
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
  endButton: {
    backgroundColor: colors.red[50],
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.red[100],
  },
  endButtonText: { color: colors.red[600], fontSize: fontSize.md, fontWeight: '700' },
});

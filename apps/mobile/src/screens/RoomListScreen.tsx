import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, Alert, Modal, Platform,
} from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useRoomStore } from '@/stores/roomStore';
import { colors, spacing, fontSize, borderRadius } from '@/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import type { Room } from '@classitin/shared';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomList'>;

export function RoomListScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { rooms, isLoading, fetchRooms, createRoom, joinRoom } = useRoomStore();
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const isTeacher = user?.role === 'TEACHER';

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 30_000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const onRefresh = useCallback(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreate = async () => {
    if (!roomName.trim()) return;
    try {
      await createRoom({ name: roomName.trim() });
      setRoomName('');
      setShowModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      await joinRoom(joinCode.trim());
      setJoinCode('');
      setShowModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const renderRoom = ({ item }: { item: Room }) => (
    <TouchableOpacity
      style={styles.roomCard}
      onPress={() => navigation.navigate('RoomDetail', { roomId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.roomIcon}>
        <Text style={styles.roomIconText}>{item.name[0].toUpperCase()}</Text>
      </View>
      <View style={styles.roomInfo}>
        <Text style={styles.roomName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.roomDesc} numberOfLines={1}>{item.description}</Text>
        ) : null}
        <Text style={styles.roomCode}>Code: {item.joinCode}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.displayName ?? 'User'}</Text>
          <Text style={styles.roleTag}>{isTeacher ? 'Teacher' : 'Student'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        {isTeacher && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => { setModalMode('create'); setShowModal(true); }}
          >
            <Text style={styles.actionButtonText}>+ Create Room</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={() => { setModalMode('join'); setShowModal(true); }}
        >
          <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>Join Room</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={renderRoom}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No rooms yet</Text>
            <Text style={styles.emptySubtext}>
              {isTeacher ? 'Create a room to get started' : 'Join a room with a code from your teacher'}
            </Text>
          </View>
        }
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalMode === 'create' ? 'Create Room' : 'Join Room'}
            </Text>
            {modalMode === 'create' ? (
              <>
                <TextInput
                  style={styles.modalInput}
                  value={roomName}
                  onChangeText={setRoomName}
                  placeholder="Room name"
                  placeholderTextColor={colors.gray[400]}
                />
                <TouchableOpacity style={styles.modalButton} onPress={handleCreate}>
                  <Text style={styles.modalButtonText}>Create</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.modalInput}
                  value={joinCode}
                  onChangeText={setJoinCode}
                  placeholder="Enter join code"
                  placeholderTextColor={colors.gray[400]}
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.modalButton} onPress={handleJoin}>
                  <Text style={styles.modalButtonText}>Join</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 16,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  greeting: { fontSize: fontSize.lg, fontWeight: '700', color: colors.gray[900] },
  roleTag: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary[600], marginTop: 2 },
  logoutButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray[100],
  },
  logoutText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.gray[600] },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary[600],
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  actionButtonText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.white },
  actionButtonTextSecondary: { color: colors.gray[700] },
  list: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, gap: spacing.sm },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomIconText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary[700] },
  roomInfo: { flex: 1 },
  roomName: { fontSize: fontSize.md, fontWeight: '700', color: colors.gray[900] },
  roomDesc: { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 2 },
  roomCode: { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.gray[400] },
  emptySubtext: { fontSize: fontSize.sm, color: colors.gray[400], marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.gray[900] },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: fontSize.md,
    color: colors.gray[900],
  },
  modalButton: {
    backgroundColor: colors.primary[600],
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
  modalCancel: { alignItems: 'center', paddingVertical: spacing.sm },
  modalCancelText: { fontSize: fontSize.md, color: colors.gray[500], fontWeight: '600' },
});

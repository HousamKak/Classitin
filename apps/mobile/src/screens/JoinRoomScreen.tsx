import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRoomStore } from '@/stores/roomStore';
import { colors, spacing, fontSize, borderRadius } from '@/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinRoom'>;

export function JoinRoomScreen({ navigation }: Props) {
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { joinRoom } = useRoomStore();

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Please enter a join code');
      return;
    }
    setIsLoading(true);
    try {
      await joinRoom(joinCode.trim());
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Join a Room</Text>
        <Text style={styles.subtitle}>Enter the code your teacher gave you</Text>

        <TextInput
          style={styles.input}
          value={joinCode}
          onChangeText={setJoinCode}
          placeholder="Enter join code"
          placeholderTextColor={colors.gray[400]}
          autoCapitalize="characters"
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{isLoading ? 'Joining...' : 'Join Room'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    gap: spacing.lg,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.gray[900], textAlign: 'center' },
  subtitle: { fontSize: fontSize.sm, color: colors.gray[500], textAlign: 'center' },
  input: {
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: 18,
    fontSize: fontSize.xl,
    color: colors.gray[900],
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 4,
  },
  button: {
    backgroundColor: colors.primary[600],
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
});

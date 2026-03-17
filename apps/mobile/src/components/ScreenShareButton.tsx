import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, borderRadius } from '@/theme';

interface ScreenShareButtonProps {
  isCapturing: boolean;
  isLoading?: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function ScreenShareButton({ isCapturing, isLoading, onStart, onStop }: ScreenShareButtonProps) {
  if (isLoading) {
    return (
      <TouchableOpacity style={[styles.button, styles.loadingButton]} disabled>
        <ActivityIndicator size="small" color={colors.primary[400]} />
        <Text style={styles.loadingText}>Starting...</Text>
      </TouchableOpacity>
    );
  }

  if (isCapturing) {
    return (
      <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={onStop} activeOpacity={0.7}>
        <Text style={styles.stopText}>Stop Sharing</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.button, styles.startButton]} onPress={onStart} activeOpacity={0.7}>
      <Text style={styles.startText}>Share Screen</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  startButton: {
    backgroundColor: colors.primary[600],
  },
  startText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  stopText: {
    color: colors.red[500],
    fontSize: 14,
    fontWeight: '600',
  },
  loadingButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  loadingText: {
    color: colors.primary[400],
    fontSize: 14,
    fontWeight: '600',
  },
});

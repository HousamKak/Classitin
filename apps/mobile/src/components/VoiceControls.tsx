import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { VoiceMode } from '@/hooks/useAudio';
import { colors, spacing, fontSize, borderRadius } from '@/theme';

interface VoiceControlsProps {
  voiceMode: VoiceMode;
  isMuted: boolean;
  privateCallName?: string;
  onStartBroadcast: () => void;
  onStop: () => void;
  onToggleMute: () => void;
}

export function VoiceControls({
  voiceMode,
  isMuted,
  privateCallName,
  onStartBroadcast,
  onStop,
  onToggleMute,
}: VoiceControlsProps) {
  if (voiceMode === 'broadcast') {
    return (
      <View style={styles.row}>
        <View style={styles.broadcastBadge}>
          <Text style={styles.broadcastText}>Broadcasting</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconButton, isMuted && styles.iconButtonMuted]}
          onPress={onToggleMute}
          activeOpacity={0.7}
        >
          <Text style={[styles.iconButtonText, isMuted && styles.iconButtonTextMuted]}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stopButton} onPress={onStop} activeOpacity={0.7}>
          <Text style={styles.stopButtonText}>End</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (voiceMode === 'private') {
    return (
      <View style={styles.row}>
        <View style={styles.privateBadge}>
          <Text style={styles.privateText}>
            {privateCallName ? `Call: ${privateCallName}` : 'Private call'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconButton, isMuted && styles.iconButtonMuted]}
          onPress={onToggleMute}
          activeOpacity={0.7}
        >
          <Text style={[styles.iconButtonText, isMuted && styles.iconButtonTextMuted]}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stopButton} onPress={onStop} activeOpacity={0.7}>
          <Text style={styles.stopButtonText}>End</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Off state
  return (
    <TouchableOpacity style={styles.announceButton} onPress={onStartBroadcast} activeOpacity={0.7}>
      <Text style={styles.announceText}>Announce</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  broadcastBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  broadcastText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary[500],
  },
  privateBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  privateText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.emerald[600],
  },
  iconButton: {
    backgroundColor: colors.gray[800],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  iconButtonMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  iconButtonText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.gray[300],
  },
  iconButtonTextMuted: {
    color: colors.red[500],
  },
  stopButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  stopButtonText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.red[500],
  },
  announceButton: {
    backgroundColor: colors.gray[800],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.gray[700],
  },
  announceText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.gray[300],
  },
});

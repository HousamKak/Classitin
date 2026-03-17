import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@/theme';

interface AudioIndicatorProps {
  isBroadcasting: boolean;
  inPrivateCall: boolean;
  callerName?: string;
  onEndCall?: () => void;
}

export function AudioIndicator({
  isBroadcasting,
  inPrivateCall,
  callerName,
  onEndCall,
}: AudioIndicatorProps) {
  if (!isBroadcasting && !inPrivateCall) return null;

  if (isBroadcasting) {
    return (
      <View style={styles.broadcastBanner}>
        <View style={styles.pulseDot} />
        <Text style={styles.broadcastText}>Teacher is speaking</Text>
      </View>
    );
  }

  return (
    <View style={styles.privateBanner}>
      <View style={styles.bannerLeft}>
        <View style={[styles.pulseDot, styles.pulseDotGreen]} />
        <Text style={styles.privateText}>
          Private call with {callerName || 'Teacher'}
        </Text>
      </View>
      {onEndCall && (
        <TouchableOpacity style={styles.endButton} onPress={onEndCall} activeOpacity={0.7}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  broadcastBanner: {
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
  broadcastText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary[400],
  },
  privateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  privateText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.emerald[500],
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
  },
  pulseDotGreen: {
    backgroundColor: colors.emerald[500],
  },
  endButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  endButtonText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.red[500],
  },
});

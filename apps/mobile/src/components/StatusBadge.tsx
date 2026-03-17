import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';
import type { PresenceStatus } from '@classitin/shared';

interface StatusBadgeProps {
  status: PresenceStatus;
  isSharing?: boolean;
}

const STATUS_CONFIG: Record<PresenceStatus, { color: string; dotColor: string; label: string }> = {
  ONLINE: { color: colors.emerald[700], dotColor: colors.emerald[500], label: 'Online' },
  IDLE: { color: colors.gray[400], dotColor: colors.gray[400], label: 'Idle' },
  NEEDS_HELP: { color: colors.amber[600], dotColor: colors.amber[500], label: 'Needs Help' },
  OFFLINE: { color: colors.gray[400], dotColor: colors.gray[300], label: 'Offline' },
};

export function StatusBadge({ status, isSharing }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: cfg.dotColor }]} />
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
      {isSharing && (
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  liveBadge: {
    backgroundColor: colors.emerald[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.emerald[600],
  },
});

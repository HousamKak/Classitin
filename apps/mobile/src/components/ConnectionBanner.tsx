import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSocket } from '@/hooks/useSocket';
import { colors, spacing, fontSize } from '@/theme';

export function ConnectionBanner() {
  const { connectionState, reconnectAttempt } = useSocket();

  if (connectionState === 'connected') return null;

  const isReconnecting = connectionState === 'reconnecting';

  return (
    <View style={[styles.banner, isReconnecting ? styles.bannerAmber : styles.bannerRed]}>
      {isReconnecting ? (
        <>
          <ActivityIndicator size="small" color={colors.amber[500]} />
          <Text style={styles.textAmber}>
            Reconnecting{reconnectAttempt > 1 ? ` (attempt ${reconnectAttempt})` : ''}...
          </Text>
        </>
      ) : (
        <Text style={styles.textRed}>
          Connection lost. Please check your network.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  bannerAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.2)',
  },
  bannerRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.2)',
  },
  textAmber: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.amber[600],
  },
  textRed: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.red[500],
  },
});

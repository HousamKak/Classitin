import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { RTCVideoView } from './RTCVideoView';
import { Avatar } from './Avatar';
import { colors, borderRadius } from '@/theme';
import type { PresenceStatus } from '@classitin/shared';

interface StudentThumbnailProps {
  displayName: string;
  track: MediaStreamTrack | null;
  status: PresenceStatus;
  isSharing: boolean;
  onPress: () => void;
}

export function StudentThumbnail({ displayName, track, status, isSharing, onPress }: StudentThumbnailProps) {
  const needsHelp = status === 'NEEDS_HELP';

  return (
    <TouchableOpacity
      style={[styles.container, needsHelp && styles.containerHelp]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.videoContainer}>
        {track ? (
          <RTCVideoView track={track} objectFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Avatar name={displayName} size={40} />
          </View>
        )}
        {/* Live indicator overlay */}
        {isSharing && (
          <View style={styles.liveOverlay}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveOverlayText}>LIVE</Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <View style={styles.nameRow}>
          <View style={[styles.statusDot, {
            backgroundColor: status === 'ONLINE' ? colors.emerald[500]
              : needsHelp ? colors.amber[500]
              : colors.gray[500],
          }]} />
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        </View>
        {needsHelp && (
          <View style={styles.helpBadge}>
            <Text style={styles.helpText}>HELP</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[800],
    backgroundColor: colors.gray[900],
    overflow: 'hidden',
  },
  containerHelp: {
    borderColor: colors.amber[500],
    borderWidth: 2,
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.black,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[800],
  },
  liveOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  livePulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.white,
  },
  liveOverlayText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[300],
    flex: 1,
  },
  helpBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  helpText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.amber[500],
  },
});

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
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.videoContainer}>
        {track ? (
          <RTCVideoView track={track} objectFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Avatar name={displayName} size={40} />
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <View style={styles.nameRow}>
          <View style={[styles.statusDot, {
            backgroundColor: status === 'ONLINE' ? colors.emerald[500]
              : status === 'NEEDS_HELP' ? colors.amber[500]
              : colors.gray[300],
          }]} />
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        </View>
        {isSharing && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        {status === 'NEEDS_HELP' && (
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
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.gray[900],
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[100],
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
    color: colors.gray[700],
    flex: 1,
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
  helpBadge: {
    backgroundColor: colors.amber[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  helpText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.amber[600],
  },
});

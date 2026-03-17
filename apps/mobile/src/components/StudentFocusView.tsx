import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { RTCVideoView } from './RTCVideoView';
import { colors, borderRadius } from '@/theme';

interface StudentFocusViewProps {
  displayName: string;
  track: MediaStreamTrack | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function StudentFocusView({ displayName, track, onClose }: StudentFocusViewProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>HD View</Text>
          <Text style={styles.name}>{displayName}</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.videoContainer}>
        {track ? (
          <RTCVideoView track={track} objectFit="contain" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Stream not available</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'rgba(0,0,0,0.95)',
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  closeText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  videoContainer: {
    flex: 1,
    margin: 16,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.gray[500],
    fontSize: 14,
  },
});

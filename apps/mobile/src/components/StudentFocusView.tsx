import { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder } from 'react-native';
import { RTCVideoView } from './RTCVideoView';
import { useDimensions } from '@/hooks/useDimensions';
import { colors, borderRadius } from '@/theme';

interface StudentFocusViewProps {
  displayName: string;
  track: MediaStreamTrack | null;
  onClose: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onStartPrivateCall?: () => void;
  isInCall?: boolean;
}

const SWIPE_THRESHOLD = 50;

export function StudentFocusView({
  displayName,
  track,
  onClose,
  onSwipeLeft,
  onSwipeRight,
  hasPrev = false,
  hasNext = false,
  onStartPrivateCall,
  isInCall = false,
}: StudentFocusViewProps) {
  const { width, height, isLandscape } = useDimensions();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD && onSwipeLeft && hasPrev) {
          onSwipeLeft();
        } else if (gestureState.dx < -SWIPE_THRESHOLD && onSwipeRight && hasNext) {
          onSwipeRight();
        }
      },
    })
  ).current;

  return (
    <View style={[styles.overlay, { width, height }]} {...panResponder.panHandlers}>
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <View>
          <Text style={styles.label}>HD View</Text>
          <Text style={styles.name}>{displayName}</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Private call button */}
          {onStartPrivateCall && !isInCall && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={onStartPrivateCall}
              activeOpacity={0.7}
            >
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
          )}
          {/* Navigation arrows */}
          {(hasPrev || hasNext) && (
            <View style={styles.navButtons}>
              <TouchableOpacity
                style={[styles.navButton, !hasPrev && styles.navButtonDisabled]}
                onPress={onSwipeLeft}
                disabled={!hasPrev}
                activeOpacity={0.7}
              >
                <Text style={[styles.navButtonText, !hasPrev && styles.navButtonTextDisabled]}>{'<'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
                onPress={onSwipeRight}
                disabled={!hasNext}
                activeOpacity={0.7}
              >
                <Text style={[styles.navButtonText, !hasNext && styles.navButtonTextDisabled]}>{'>'}</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={[styles.videoContainer, isLandscape && styles.videoContainerLandscape]}>
        {track ? (
          <RTCVideoView track={track} objectFit="contain" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Stream not available</Text>
          </View>
        )}
      </View>
      {/* Swipe hint */}
      {(hasPrev || hasNext) && (
        <Text style={styles.swipeHint}>Swipe left/right to navigate between students</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
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
  headerLandscape: {
    paddingTop: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: colors.gray[500],
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
  callButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  callButtonText: {
    color: '#34d399',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
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
  videoContainerLandscape: {
    marginTop: 8,
    marginBottom: 8,
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
  swipeHint: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.gray[600],
    paddingBottom: 12,
  },
});

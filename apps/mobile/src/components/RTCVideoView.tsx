import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';

interface RTCVideoViewProps {
  track: MediaStreamTrack | null;
  objectFit?: 'contain' | 'cover';
  style?: object;
}

export function RTCVideoView({ track, objectFit = 'contain', style }: RTCVideoViewProps) {
  const [streamURL, setStreamURL] = useState<string | null>(null);

  useEffect(() => {
    if (track) {
      const stream = new MediaStream([track]);
      setStreamURL(stream.toURL());
      return () => {
        setStreamURL(null);
      };
    } else {
      setStreamURL(null);
    }
  }, [track]);

  if (!streamURL) return null;

  return (
    <RTCView
      streamURL={streamURL}
      objectFit={objectFit}
      style={[styles.video, style]}
    />
  );
}

const styles = StyleSheet.create({
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
});

import { useState, useCallback, useRef } from 'react';
import { mediaDevices, MediaStream } from 'react-native-webrtc';

export function useScreenCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const startCapture = useCallback(async () => {
    try {
      // On Android: triggers MediaProjection permission dialog
      // On iOS: uses RPScreenRecorder for in-app capture
      const stream = await mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const track = stream.getVideoTracks()[0];
      console.log('[useScreenCapture] Track obtained:', track.id, 'readyState:', track.readyState);

      // react-native-webrtc may need a brief moment before the track is usable
      await new Promise((r) => setTimeout(r, 200));

      streamRef.current = stream;
      trackRef.current = track;
      setIsCapturing(true);

      // Handle native stop (e.g., user stops from notification)
      track.addEventListener('ended', () => {
        streamRef.current = null;
        trackRef.current = null;
        setIsCapturing(false);
      });

      return track;
    } catch (err) {
      console.error('Screen capture failed:', err);
      setIsCapturing(false);
      throw err;
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (trackRef.current) {
      trackRef.current.stop();
      trackRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  return { isCapturing, startCapture, stopCapture };
}

import { useState, useCallback, useRef } from 'react';
import { Platform, NativeModules, findNodeHandle } from 'react-native';
import { mediaDevices, MediaStream } from 'react-native-webrtc';

/**
 * On iOS, system-wide screen capture requires the Broadcast Upload Extension.
 * react-native-webrtc provides ScreenCapturePickerView to trigger the
 * RPSystemBroadcastPickerView, and its native ScreenCapturer receives frames
 * from the extension via Unix domain socket in the App Group container.
 *
 * On Android, getDisplayMedia() triggers MediaProjection which already
 * captures system-wide.
 */
export function useScreenCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const startCapture = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        // On iOS, getDisplayMedia with the Broadcast Extension configured
        // will use the extension for system-wide capture.
        // react-native-webrtc checks RTCAppGroupIdentifier in Info.plist
        // and sets up the socket-based frame receiver automatically.
        const stream = await mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        const track = stream.getVideoTracks()[0];
        console.log('[useScreenCapture] iOS broadcast track:', track.id, 'readyState:', track.readyState);

        // Wait for extension to connect and start sending frames
        await new Promise((r) => setTimeout(r, 500));

        streamRef.current = stream;
        trackRef.current = track;
        setIsCapturing(true);

        track.addEventListener('ended', () => {
          streamRef.current = null;
          trackRef.current = null;
          setIsCapturing(false);
        });

        return track;
      } else {
        // Android: MediaProjection — already system-wide
        const stream = await mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        const track = stream.getVideoTracks()[0];
        console.log('[useScreenCapture] Track obtained:', track.id, 'readyState:', track.readyState);

        await new Promise((r) => setTimeout(r, 200));

        streamRef.current = stream;
        trackRef.current = track;
        setIsCapturing(true);

        track.addEventListener('ended', () => {
          streamRef.current = null;
          trackRef.current = null;
          setIsCapturing(false);
        });

        return track;
      }
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

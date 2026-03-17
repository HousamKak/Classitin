import { useState, useCallback, useRef } from 'react';
import { SCREEN_CAPTURE_CONSTRAINTS } from '@classitin/shared';

export function useScreenCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const isSupported = typeof navigator !== 'undefined'
    && !!navigator.mediaDevices
    && !!navigator.mediaDevices.getDisplayMedia;

  const startCapture = useCallback(async (constraints?: DisplayMediaStreamOptions) => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      const err = new Error('Screen sharing is not supported in this browser or requires a secure (HTTPS) connection.');
      setError(err);
      throw err;
    }
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia(
        constraints ?? SCREEN_CAPTURE_CONSTRAINTS as DisplayMediaStreamOptions
      );
      const track = stream.getVideoTracks()[0];

      streamRef.current = stream;
      trackRef.current = track;
      setIsCapturing(true);

      track.onended = () => {
        streamRef.current = null;
        trackRef.current = null;
        setIsCapturing(false);
      };

      return track;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to capture screen');
      setError(e);
      setIsCapturing(false);
      throw e;
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (trackRef.current) {
      trackRef.current.stop();
      trackRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  return {
    stream: streamRef.current,
    track: trackRef.current,
    isCapturing,
    isSupported,
    startCapture,
    stopCapture,
    error,
  };
}

import { useEffect, useRef, useCallback } from 'react';

interface VideoRendererProps {
  track: MediaStreamTrack | null;
  muted?: boolean;
  className?: string;
  mirror?: boolean;
}

export function VideoRenderer({ track, muted = true, className = '', mirror = false }: VideoRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentTrackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Skip if same track already attached
    if (track === currentTrackRef.current) return;
    currentTrackRef.current = track;

    if (!track) {
      video.srcObject = null;
      return;
    }

    console.log('[VideoRenderer] Attaching track:', {
      trackId: track.id,
      kind: track.kind,
      readyState: track.readyState,
      muted: track.muted,
      enabled: track.enabled,
    });

    const stream = new MediaStream([track]);
    video.srcObject = stream;

    // Monitor track state changes
    const onUnmute = () => {
      console.log('[VideoRenderer] Track unmuted:', track.id);
    };
    const onMute = () => console.log('[VideoRenderer] Track muted:', track.id);
    const onEnded = () => console.log('[VideoRenderer] Track ended:', track.id);

    track.addEventListener('unmute', onUnmute);
    track.addEventListener('mute', onMute);
    track.addEventListener('ended', onEnded);

    return () => {
      track.removeEventListener('unmute', onUnmute);
      track.removeEventListener('mute', onMute);
      track.removeEventListener('ended', onEnded);
      currentTrackRef.current = null;
    };
  }, [track]);

  // Use onLoadedMetadata to play — avoids the "play() interrupted" race
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    console.log('[VideoRenderer] loadedmetadata fired, calling play()');
    video.play().catch((err) => {
      console.warn('[VideoRenderer] play() failed:', err.message);
    });
  }, []);

  return (
    <video
      ref={videoRef}
      onLoadedMetadata={handleLoadedMetadata}
      autoPlay
      playsInline
      muted={muted}
      className={`block bg-gray-900 ${mirror ? 'scale-x-[-1]' : ''} ${className}`}
    />
  );
}

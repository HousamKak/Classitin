import { useEffect, useRef, useCallback, useState } from 'react';

interface VideoRendererProps {
  track: MediaStreamTrack | null;
  muted?: boolean;
  className?: string;
  mirror?: boolean;
}

export function VideoRenderer({ track, muted = true, className = '', mirror = false }: VideoRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentTrackRef = useRef<MediaStreamTrack | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string | undefined>(undefined);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Skip if same track already attached
    if (track === currentTrackRef.current) return;
    currentTrackRef.current = track;

    if (!track) {
      video.srcObject = null;
      setAspectRatio(undefined);
      return;
    }

    const stream = new MediaStream([track]);
    video.srcObject = stream;

    const onEnded = () => {
      setAspectRatio(undefined);
    };

    track.addEventListener('ended', onEnded);

    return () => {
      track.removeEventListener('ended', onEnded);
      currentTrackRef.current = null;
    };
  }, [track]);

  // Use onLoadedMetadata to play and detect aspect ratio
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.videoWidth && video.videoHeight) {
      setAspectRatio(`${video.videoWidth} / ${video.videoHeight}`);
    }
    video.play().catch(() => {
      // autoplay may be blocked
    });
  }, []);

  // Handle resize events (e.g. simulcast layer switch changes resolution)
  const handleResize = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.videoWidth && video.videoHeight) {
      setAspectRatio(`${video.videoWidth} / ${video.videoHeight}`);
    }
  }, []);

  return (
    <video
      ref={videoRef}
      onLoadedMetadata={handleLoadedMetadata}
      onResize={handleResize}
      autoPlay
      playsInline
      muted={muted}
      style={aspectRatio ? { aspectRatio } : undefined}
      className={`block bg-gray-900 ${mirror ? 'scale-x-[-1]' : ''} ${className}`}
    />
  );
}

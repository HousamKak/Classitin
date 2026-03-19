import { useCallback } from 'react';
import { ScreenCaptureButton } from '@/components/media/ScreenCaptureButton';
import { VideoRenderer } from '@/components/media/VideoRenderer';
import { useScreenCapture } from '@/hooks/useScreenCapture';
import { useMediaStore } from '@/stores/mediaStore';
import { produceScreen, closeProducer } from '@/services/mediasoupClient';
import type { Transport } from 'mediasoup-client/types';
import { TEACHER_SCREEN_CAPTURE_CONSTRAINTS } from '@classitin/shared';
import { Monitor } from 'lucide-react';

interface TeacherScreenShareProps {
  sendTransport: Transport | null;
  getSendTransport: () => Promise<Transport>;
}

export function TeacherScreenShare({ sendTransport, getSendTransport }: TeacherScreenShareProps) {
  const { isCapturing, isSupported, startCapture, stopCapture } = useScreenCapture();
  const localScreenTrack = useMediaStore((s) => s.localScreenTrack);
  const localProducerId = useMediaStore((s) => s.localProducerId);
  const setLocalScreenTrack = useMediaStore((s) => s.setLocalScreenTrack);
  const setLocalProducerId = useMediaStore((s) => s.setLocalProducerId);

  const handleStart = useCallback(async () => {
    try {
      const track = await startCapture(TEACHER_SCREEN_CAPTURE_CONSTRAINTS as DisplayMediaStreamOptions);
      if (!track) return;
      setLocalScreenTrack(track);

      const transport = sendTransport ?? await getSendTransport();
      const producer = await produceScreen(transport, track, false);
      setLocalProducerId(producer.id);

      track.onended = () => {
        if (producer.id) closeProducer(producer.id);
        setLocalScreenTrack(null);
        setLocalProducerId(null);
      };
    } catch (err) {
      console.error('Failed to start screen share:', err);
    }
  }, [sendTransport, getSendTransport, startCapture, setLocalScreenTrack, setLocalProducerId]);

  const handleStop = useCallback(() => {
    stopCapture();
    if (localProducerId) {
      closeProducer(localProducerId);
    }
    setLocalScreenTrack(null);
    setLocalProducerId(null);
  }, [stopCapture, localProducerId, setLocalScreenTrack, setLocalProducerId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-gray-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Your Screen</h3>
        </div>
        <ScreenCaptureButton isCapturing={isCapturing} isSupported={isSupported} onStart={handleStart} onStop={handleStop} />
      </div>
      {localScreenTrack ? (
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-lg animate-glow aspect-video max-h-[240px]">
          <VideoRenderer track={localScreenTrack} className="w-full h-full object-contain" />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-800 bg-gray-900/50 py-8 gap-2">
          <Monitor className="h-8 w-8 text-gray-700" />
          <p className="text-sm text-gray-500">
            {isSupported
              ? 'Share your screen so students can see your work'
              : /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                ? 'Screen sharing is not available on mobile browsers'
                : 'Screen sharing requires a desktop browser with HTTPS'}
          </p>
        </div>
      )}
    </div>
  );
}

import { useCallback } from 'react';
import { ScreenCaptureButton } from '@/components/media/ScreenCaptureButton';
import { useScreenCapture } from '@/hooks/useScreenCapture';
import { useMediaStore } from '@/stores/mediaStore';
import { produceScreen, closeProducer } from '@/services/mediasoupClient';
import type { Transport } from 'mediasoup-client/types';

interface ScreenShareToggleProps {
  sendTransport: Transport | null;
  getSendTransport: () => Promise<Transport>;
}

export function ScreenShareToggle({ sendTransport, getSendTransport }: ScreenShareToggleProps) {
  const { isCapturing, isSupported, startCapture, stopCapture } = useScreenCapture();
  const localProducerId = useMediaStore((s) => s.localProducerId);
  const setLocalScreenTrack = useMediaStore((s) => s.setLocalScreenTrack);
  const setLocalProducerId = useMediaStore((s) => s.setLocalProducerId);

  const handleStart = useCallback(async () => {
    try {
      const track = await startCapture();
      if (!track) return;
      setLocalScreenTrack(track);

      const transport = sendTransport ?? await getSendTransport();
      // Student uses simulcast for teacher to switch layers
      const producer = await produceScreen(transport, track, true);
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
    <ScreenCaptureButton isCapturing={isCapturing} isSupported={isSupported} onStart={handleStart} onStop={handleStop} />
  );
}

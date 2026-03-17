import { useCallback, useRef, useState } from 'react';
import { mediaDevices } from 'react-native-webrtc';
import { produceAudio, closeProducer } from '@/services/mediasoupClient';
import type { Transport, Producer } from 'mediasoup-client/lib/types';

export type VoiceMode = 'off' | 'broadcast' | 'private';

interface UseAudioOptions {
  getSendTransport: () => Promise<Transport>;
}

export function useAudio({ getSendTransport }: UseAudioOptions) {
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('off');
  const [isMuted, setIsMuted] = useState(false);
  const [privateCallUserId, setPrivateCallUserId] = useState<string | null>(null);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const producerRef = useRef<Producer | null>(null);

  const startMicrophone = useCallback(async () => {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    return (stream as any).getAudioTracks()[0] as MediaStreamTrack;
  }, []);

  const startBroadcast = useCallback(async () => {
    try {
      const track = await startMicrophone();
      audioTrackRef.current = track;

      const transport = await getSendTransport();
      const producer = await produceAudio(transport, track, 'broadcast');
      producerRef.current = producer;

      setVoiceMode('broadcast');
      setIsMuted(false);

      track.onended = () => {
        stopVoice();
      };
    } catch (err) {
      console.error('Failed to start broadcast:', err);
    }
  }, [getSendTransport, startMicrophone]);

  const startPrivateCall = useCallback(async (targetUserId: string) => {
    try {
      const track = await startMicrophone();
      audioTrackRef.current = track;

      const transport = await getSendTransport();
      const producer = await produceAudio(transport, track, 'private', targetUserId);
      producerRef.current = producer;

      setVoiceMode('private');
      setPrivateCallUserId(targetUserId);
      setIsMuted(false);

      track.onended = () => {
        stopVoice();
      };
    } catch (err) {
      console.error('Failed to start private call:', err);
    }
  }, [getSendTransport, startMicrophone]);

  const stopVoice = useCallback(() => {
    if (producerRef.current) {
      closeProducer(producerRef.current.id);
      producerRef.current = null;
    }
    if (audioTrackRef.current) {
      audioTrackRef.current.stop();
      audioTrackRef.current = null;
    }
    setVoiceMode('off');
    setPrivateCallUserId(null);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (producerRef.current) {
      if (isMuted) {
        producerRef.current.resume();
      } else {
        producerRef.current.pause();
      }
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  return {
    voiceMode,
    isMuted,
    privateCallUserId,
    startBroadcast,
    startPrivateCall,
    stopVoice,
    toggleMute,
  };
}

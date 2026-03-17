import { useRef, useCallback, useState } from 'react';
import type { Transport, RtpCapabilities } from 'mediasoup-client/types';
import {
  loadDevice,
  createSendTransport,
  createRecvTransport,
} from '@/services/mediasoupClient';

export function useMediasoup(sessionId: string) {
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const [isReady, setIsReady] = useState(false);

  const initDevice = useCallback(async (rtpCapabilities: RtpCapabilities) => {
    await loadDevice(rtpCapabilities);
    setIsReady(true);
  }, []);

  const getSendTransport = useCallback(async () => {
    if (sendTransportRef.current) return sendTransportRef.current;
    const transport = await createSendTransport(sessionId);
    sendTransportRef.current = transport;
    return transport;
  }, [sessionId]);

  const getRecvTransport = useCallback(async () => {
    if (recvTransportRef.current) return recvTransportRef.current;
    const transport = await createRecvTransport(sessionId);
    recvTransportRef.current = transport;
    return transport;
  }, [sessionId]);

  const cleanup = useCallback(() => {
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();
    sendTransportRef.current = null;
    recvTransportRef.current = null;
    setIsReady(false);
  }, []);

  return {
    isReady,
    initDevice,
    getSendTransport,
    getRecvTransport,
    cleanup,
  };
}

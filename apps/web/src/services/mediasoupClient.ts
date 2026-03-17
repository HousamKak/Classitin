import * as mediasoupClient from 'mediasoup-client';
import type { Device, Transport, Producer, Consumer } from 'mediasoup-client/types';
import { getSocket } from './socket';
import { SIMULCAST_ENCODINGS } from '@classitin/shared';

let device: Device | null = null;

export function getDevice(): Device {
  if (!device) {
    device = new mediasoupClient.Device();
  }
  return device;
}

export async function loadDevice(rtpCapabilities: mediasoupClient.types.RtpCapabilities) {
  const d = getDevice();
  if (!d.loaded) {
    await d.load({ routerRtpCapabilities: rtpCapabilities });
  }
  return d;
}

export async function createSendTransport(sessionId: string): Promise<Transport> {
  const socket = getSocket();

  const params = await new Promise<Record<string, unknown>>((resolve, reject) => {
    socket.emit('transport:create-send', { sessionId }, (response: Record<string, unknown>) => {
      if (response.error) reject(new Error(response.error as string));
      else resolve(response);
    });
  });

  const d = getDevice();
  const transport = d.createSendTransport(params as Parameters<typeof d.createSendTransport>[0]);

  transport.on('connect', ({ dtlsParameters }, callback, errback) => {
    socket.emit(
      'transport:connect',
      { transportId: transport.id, dtlsParameters },
      (response: Record<string, unknown>) => {
        if (response.error) errback(new Error(response.error as string));
        else callback();
      }
    );
  });

  transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
    socket.emit(
      'transport:produce',
      { transportId: transport.id, kind, rtpParameters, appData },
      (response: Record<string, unknown>) => {
        if (response.error) errback(new Error(response.error as string));
        else callback({ id: response.producerId as string });
      }
    );
  });

  return transport;
}

export async function createRecvTransport(sessionId: string): Promise<Transport> {
  const socket = getSocket();

  const params = await new Promise<Record<string, unknown>>((resolve, reject) => {
    socket.emit('transport:create-recv', { sessionId }, (response: Record<string, unknown>) => {
      if (response.error) reject(new Error(response.error as string));
      else resolve(response);
    });
  });

  const d = getDevice();
  const transport = d.createRecvTransport(params as Parameters<typeof d.createRecvTransport>[0]);

  transport.on('connect', ({ dtlsParameters }, callback, errback) => {
    socket.emit(
      'transport:connect',
      { transportId: transport.id, dtlsParameters },
      (response: Record<string, unknown>) => {
        if (response.error) errback(new Error(response.error as string));
        else callback();
      }
    );
  });

  return transport;
}

export async function produceScreen(
  transport: Transport,
  track: MediaStreamTrack,
  useSimulcast: boolean
): Promise<Producer> {
  const d = getDevice();

  // Force VP8 codec — H264 hardware encoder on some platforms (notably Android)
  // produces screen share output that remote consumers can't decode
  const vp8Codec = d.rtpCapabilities.codecs?.find(
    (c) => c.mimeType.toLowerCase() === 'video/vp8'
  );

  const params: Parameters<Transport['produce']>[0] = {
    track,
    appData: { source: 'screen' },
    ...(vp8Codec ? { codec: vp8Codec } : {}),
  };

  if (useSimulcast) {
    params.encodings = SIMULCAST_ENCODINGS.map((e) => ({
      rid: e.rid,
      maxBitrate: e.maxBitrate,
      scaleResolutionDownBy: e.scaleResolutionDownBy,
    }));
    params.codecOptions = { videoGoogleStartBitrate: 100 };
  }

  return transport.produce(params);
}

export async function consumeStream(
  transport: Transport,
  sessionId: string,
  producerId: string
): Promise<Consumer> {
  const socket = getSocket();
  const d = getDevice();

  const params = await new Promise<Record<string, unknown>>((resolve, reject) => {
    socket.emit(
      'consume:start',
      {
        sessionId,
        producerId,
        rtpCapabilities: d.rtpCapabilities,
      },
      (response: Record<string, unknown>) => {
        if (response.error) reject(new Error(response.error as string));
        else resolve(response);
      }
    );
  });

  const consumer = await transport.consume({
    id: params.consumerId as string,
    producerId: params.producerId as string,
    kind: params.kind as 'video' | 'audio',
    rtpParameters: params.rtpParameters as mediasoupClient.types.RtpParameters,
  });

  // Resume the consumer
  await new Promise<void>((resolve, reject) => {
    socket.emit('consume:resume', { consumerId: consumer.id }, (response: Record<string, unknown>) => {
      if (response.error) reject(new Error(response.error as string));
      else resolve();
    });
  });

  return consumer;
}

export function setPreferredLayers(consumerId: string, spatialLayer: number, temporalLayer?: number) {
  const socket = getSocket();
  socket.emit('consume:set-preferred-layers', { consumerId, spatialLayer, temporalLayer }, () => {});
}

export function closeProducer(producerId: string) {
  const socket = getSocket();
  socket.emit('producer:close', { producerId }, () => {});
}

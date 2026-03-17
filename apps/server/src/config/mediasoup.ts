import os from 'os';
import { config } from './index.js';

export const workerSettings = {
  rtcMinPort: config.mediasoup.minPort,
  rtcMaxPort: config.mediasoup.maxPort,
  logLevel: 'warn',
  logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
};

export const numWorkers = Math.min(
  os.cpus().length,
  config.mediasoup.numWorkers
);

export const routerOptions = {
  mediaCodecs: [
    {
      kind: 'audio' as const,
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: 'video' as const,
      mimeType: 'video/VP8',
      clockRate: 90000,
    },
    {
      kind: 'video' as const,
      mimeType: 'video/H264',
      clockRate: 90000,
      parameters: {
        'packetization-mode': 1,
        'profile-level-id': '42e01f',
        'level-asymmetry-allowed': 1,
      },
    },
  ],
};

export const webRtcTransportOptions = {
  listenInfos: [
    {
      protocol: 'udp' as const,
      ip: '0.0.0.0',
      announcedAddress: config.mediasoup.announcedIp,
    },
    {
      protocol: 'tcp' as const,
      ip: '0.0.0.0',
      announcedAddress: config.mediasoup.announcedIp,
    },
  ],
  initialAvailableOutgoingBitrate: 1_000_000,
  maxIncomingBitrate: 3_000_000,
};

// Build ICE servers for TURN relay (passed to clients, not to mediasoup server)
export function getIceServers(): Array<{ urls: string; username?: string; credential?: string }> {
  const servers: Array<{ urls: string; username?: string; credential?: string }> = [];

  if (config.mediasoup.turnUrl) {
    servers.push({
      urls: config.mediasoup.turnUrl,
      username: config.mediasoup.turnUsername || undefined,
      credential: config.mediasoup.turnCredential || undefined,
    });
  }

  return servers;
}

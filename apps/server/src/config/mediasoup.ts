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
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
    },
    {
      kind: 'video',
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
      protocol: 'udp',
      ip: '0.0.0.0',
      announcedAddress: config.mediasoup.announcedIp,
    },
    {
      protocol: 'tcp',
      ip: '0.0.0.0',
      announcedAddress: config.mediasoup.announcedIp,
    },
  ],
  initialAvailableOutgoingBitrate: 800_000,
  maxIncomingBitrate: 1_500_000,
};

export const simulcastEncodings = [
  { rid: 'r0', maxBitrate: 100_000, scaleResolutionDownBy: 4 },
  { rid: 'r1', maxBitrate: 300_000, scaleResolutionDownBy: 2 },
  { rid: 'r2', maxBitrate: 1_200_000, scaleResolutionDownBy: 1 },
];

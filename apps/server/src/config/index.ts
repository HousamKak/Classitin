import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  },

  mediasoup: {
    announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1',
    minPort: parseInt(process.env.MEDIASOUP_MIN_PORT || '40000', 10),
    maxPort: parseInt(process.env.MEDIASOUP_MAX_PORT || '49999', 10),
    numWorkers: parseInt(process.env.MEDIASOUP_NUM_WORKERS || '2', 10),
  },

  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim()),
    credentials: true,
  },
} as const;

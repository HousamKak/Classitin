import { createServer } from 'https';
import { createServer as createHttpServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { prisma } from './config/database.js';
import { workerManager } from './mediasoup/workerManager.js';
import { createSocketServer } from './socket/index.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Connect to database
  await prisma.$connect();
  logger.info('Connected to SQLite database');

  // Create mediasoup workers
  await workerManager.createWorkers();
  logger.info(`Created ${workerManager.workerCount} mediasoup workers`);

  // Create Express app
  const app = express();
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (config.cors.origin.includes(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
  }));
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', workers: workerManager.workerCount });
  });

  // Mount API routes
  app.use('/api/v1', apiRoutes);

  // Error handler
  app.use(errorHandler);

  // Create HTTPS server
  const httpsOptions = {
    key: fs.readFileSync(path.resolve(__dirname, '../../../infrastructure/certs/key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname, '../../../infrastructure/certs/cert.pem')),
  };
  const httpServer = createServer(httpsOptions, app);

  // Create Socket.IO server (single instance shared across both HTTP and HTTPS)
  const io = createSocketServer(httpServer);

  // Start listening (HTTPS)
  httpServer.listen(config.port, '0.0.0.0', () => {
    logger.info(`Server running on https://localhost:${config.port}`);
    logger.info(`mediasoup workers: ${workerManager.workerCount}`);
  });

  // Also start HTTP server for mobile dev (avoids self-signed cert issues)
  // Attach the SAME Socket.IO instance so rooms/events are shared
  const httpPort = config.port + 1; // 3002
  const plainHttpServer = createHttpServer(app);
  io.attach(plainHttpServer);
  plainHttpServer.listen(httpPort, '0.0.0.0', () => {
    logger.info(`HTTP server running on http://localhost:${httpPort} (mobile dev)`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await workerManager.close();
    await prisma.$disconnect();
    httpServer.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});

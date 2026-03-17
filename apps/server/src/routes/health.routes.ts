import { Router } from 'express';
import { workerManager } from '../mediasoup/workerManager.js';
import { roomManager } from '../mediasoup/roomManager.js';
import { presenceService } from '../services/presence.service.js';

const router: ReturnType<typeof Router> = Router();

// Public health check
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Detailed stats (could be auth-gated in production)
router.get('/stats', async (_req, res) => {
  const [workerStats, mediaStats, presenceStats] = await Promise.all([
    workerManager.getResourceUsage(),
    Promise.resolve(roomManager.getStats()),
    Promise.resolve(presenceService.getStats()),
  ]);

  res.json({
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    workers: {
      count: workerManager.workerCount,
      resources: workerStats,
    },
    media: mediaStats,
    presence: presenceStats,
  });
});

export default router;

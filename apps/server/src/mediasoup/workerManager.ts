import mediasoup from 'mediasoup';
import { workerSettings, numWorkers } from '../config/mediasoup.js';
import { logger } from '../utils/logger.js';

class WorkerManager {
  private workers: mediasoup.types.Worker[] = [];
  private nextWorkerIndex = 0;

  async createWorkers(): Promise<void> {
    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker(workerSettings as mediasoup.types.WorkerSettings);
      worker.on('died', () => {
        logger.error(`mediasoup worker ${worker.pid} died, exiting`);
        process.exit(1);
      });
      this.workers.push(worker);
      logger.info(`mediasoup worker ${worker.pid} created`);
    }
  }

  getNextWorker(): mediasoup.types.Worker {
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  get workerCount(): number {
    return this.workers.length;
  }

  async getResourceUsage(): Promise<Array<{ pid: number; usage: mediasoup.types.WorkerResourceUsage }>> {
    const stats = [];
    for (const worker of this.workers) {
      try {
        const usage = await worker.getResourceUsage();
        stats.push({ pid: worker.pid, usage });
      } catch {
        // Worker may have died
      }
    }
    return stats;
  }

  async close(): Promise<void> {
    for (const worker of this.workers) {
      worker.close();
    }
    this.workers = [];
  }
}

export const workerManager = new WorkerManager();

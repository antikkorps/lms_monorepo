import { Worker, type Job } from 'bullmq';
import { config } from '../../config/index.js';
import { resetDemoData } from '../../services/demo/demo-reset.service.js';
import { logger } from '../../utils/logger.js';
import { queueConnection } from '../connection.js';
import { DEMO_RESET_QUEUE_NAME } from '../demo-reset.queue.js';

async function processDemoReset(_job: Job): Promise<void> {
  await resetDemoData();
}

let worker: Worker | null = null;

export function startDemoResetWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker(DEMO_RESET_QUEUE_NAME, processDemoReset, {
    connection: queueConnection,
    concurrency: 1,
  });

  worker.on('completed', (job: Job) => {
    logger.debug({ jobId: job.id }, 'Demo reset job completed');
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    logger.error(
      { jobId: job?.id, error: error.message },
      'Demo reset job failed',
    );
  });

  logger.info('Demo reset worker started');

  return worker;
}

export async function stopDemoResetWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Demo reset worker stopped');
  }
}

export async function scheduleDemoReset(): Promise<void> {
  if (!config.demo.enabled) {
    return;
  }

  const { demoResetQueue } = await import('../demo-reset.queue.js');
  await demoResetQueue.add(
    'reset-demo-account',
    {},
    {
      repeat: {
        pattern: '0 3 * * *', // Daily at 3:00 AM
      },
    },
  );
  logger.info('Demo reset cron job scheduled (daily at 3:00 AM)');
}

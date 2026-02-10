import { Worker, type Job } from 'bullmq';
import { queueConnection } from '../connection.js';
import { STREAK_QUEUE_NAME, type StreakJobData } from '../streak.queue.js';
import { recordActivity, recalculateStreak } from '../../streaks/controller.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

async function processStreakUpdate(job: Job<StreakJobData>): Promise<void> {
  const { userId, activityType, referenceId } = job.data;

  logger.info({ jobId: job.id, userId, activityType }, 'Processing streak update');

  try {
    // Record the activity (idempotent)
    await recordActivity(userId, activityType, referenceId);

    // Recalculate the streak
    await recalculateStreak(userId);

    logger.info({ jobId: job.id, userId }, 'Streak update processed');
  } catch (error) {
    logger.error(
      { jobId: job.id, userId, error: error instanceof Error ? error.message : 'Unknown' },
      'Failed to process streak update'
    );
    throw error;
  }
}

let worker: Worker | null = null;

export function startStreakWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker<StreakJobData>(STREAK_QUEUE_NAME, processStreakUpdate, {
    connection: queueConnection,
    concurrency: config.queue.concurrency,
  });

  worker.on('completed', (job: Job<StreakJobData>) => {
    logger.debug({ jobId: job.id }, 'Streak update job completed');
  });

  worker.on('failed', (job: Job<StreakJobData> | undefined, error: Error) => {
    logger.error(
      { jobId: job?.id, error: error.message },
      'Streak update job failed'
    );
  });

  logger.info('Streak worker started');

  return worker;
}

export async function stopStreakWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Streak worker stopped');
  }
}

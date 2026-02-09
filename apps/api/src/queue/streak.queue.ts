import { Queue } from 'bullmq';
import { queueConnection } from './connection.js';

export const STREAK_QUEUE_NAME = 'streak-updates';

export interface StreakJobData {
  userId: string;
  activityType: string;
  referenceId?: string;
}

export const streakQueue = new Queue<StreakJobData>(STREAK_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export async function addStreakUpdateJob(data: StreakJobData): Promise<void> {
  await streakQueue.add('update-streak', data);
}

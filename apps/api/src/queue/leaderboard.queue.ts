import { Queue } from 'bullmq';
import { queueConnection } from './connection.js';

export const LEADERBOARD_QUEUE_NAME = 'leaderboard-refresh';

export interface LeaderboardJobData {
  trigger: 'scheduled' | 'manual';
}

export const leaderboardQueue = new Queue<LeaderboardJobData>(LEADERBOARD_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

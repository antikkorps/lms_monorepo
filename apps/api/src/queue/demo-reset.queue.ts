import { Queue } from 'bullmq';
import { queueConnection } from './connection.js';

export const DEMO_RESET_QUEUE_NAME = 'demo-reset';

export const demoResetQueue = new Queue(DEMO_RESET_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: 20,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

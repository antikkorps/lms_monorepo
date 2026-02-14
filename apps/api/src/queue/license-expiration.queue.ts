import { Queue } from 'bullmq';
import { queueConnection } from './connection.js';

export const LICENSE_EXPIRATION_QUEUE_NAME = 'license-expiration';

export const licenseExpirationQueue = new Queue(LICENSE_EXPIRATION_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 200,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

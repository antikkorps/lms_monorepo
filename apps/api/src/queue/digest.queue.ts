import { Queue } from 'bullmq';
import { queueConnection } from './connection.js';
import type { DigestFrequency, SupportedLocale } from '../database/models/enums.js';

export const DIGEST_QUEUE_NAME = 'digest';

export interface DigestJobData {
  userId: string;
  userEmail: string;
  userFirstName: string;
  frequency: DigestFrequency;
  locale?: SupportedLocale;
}

export interface DigestTriggerJobData {
  frequency: DigestFrequency;
  dayOfWeek: number;
}

export const digestQueue = new Queue<DigestJobData | DigestTriggerJobData>(DIGEST_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export async function addDigestJob(data: DigestJobData): Promise<void> {
  await digestQueue.add('send-digest', data);
}

export async function triggerDigestForFrequency(frequency: DigestFrequency): Promise<void> {
  const dayOfWeek = new Date().getDay();
  await digestQueue.add('trigger-digests', { frequency, dayOfWeek });
}

import { Queue } from 'bullmq';
import { queueConnection } from './connection.js';

export const TRANSCODING_QUEUE_NAME = 'transcoding';

export interface SubmitTranscodingJobData {
  type: 'submit-transcoding';
  lessonContentId: string;
  lessonId: string;
  lang: string;
  videoSourceKey: string;
}

export interface CheckTranscodingStatusJobData {
  type: 'check-transcoding-status';
  lessonContentId: string;
  videoStreamId: string;
  attempt: number;
}

export type TranscodingJobData = SubmitTranscodingJobData | CheckTranscodingStatusJobData;

export const transcodingQueue = new Queue<TranscodingJobData>(TRANSCODING_QUEUE_NAME, {
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

export async function addSubmitTranscodingJob(data: Omit<SubmitTranscodingJobData, 'type'>): Promise<void> {
  await transcodingQueue.add('submit-transcoding', {
    type: 'submit-transcoding',
    ...data,
  });
}

export async function addCheckTranscodingStatusJob(
  data: Omit<CheckTranscodingStatusJobData, 'type'>,
  delayMs = 30000
): Promise<void> {
  await transcodingQueue.add('check-transcoding-status', {
    type: 'check-transcoding-status',
    ...data,
  }, {
    delay: delayMs,
  });
}

import { Worker, type Job } from 'bullmq';
import { queueConnection } from '../connection.js';
import {
  TRANSCODING_QUEUE_NAME,
  addCheckTranscodingStatusJob,
  type TranscodingJobData,
  type SubmitTranscodingJobData,
  type CheckTranscodingStatusJobData,
} from '../transcoding.queue.js';
import { LessonContent, Lesson } from '../../database/models/index.js';
import { TranscodingStatus } from '../../database/models/enums.js';
import { getTranscoding } from '../../services/transcoding/index.js';
import { getStorage } from '../../storage/index.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

const MAX_CHECK_ATTEMPTS = 60;
const CHECK_DELAY_MS = 30000;
const SAFETY_NET_DELAY_MS = 10 * 60 * 1000; // 10 minutes

async function processSubmitTranscoding(job: Job<SubmitTranscodingJobData>): Promise<void> {
  const { lessonContentId, videoSourceKey } = job.data;

  logger.info({ jobId: job.id, lessonContentId, videoSourceKey }, 'Processing submit-transcoding job');

  const content = await LessonContent.findByPk(lessonContentId);
  if (!content) {
    logger.warn({ lessonContentId }, 'LessonContent not found, skipping transcoding');
    return;
  }

  const storage = getStorage();
  const signedUrl = await storage.getSignedUrl(videoSourceKey, { expiresIn: 3600 });

  const transcoding = getTranscoding();
  const result = await transcoding.submit({
    url: signedUrl,
    meta: {
      lessonContentId,
      lessonId: content.lessonId,
      lang: content.lang,
    },
  });

  await content.update({
    videoStreamId: result.uid,
    transcodingStatus: TranscodingStatus.PROCESSING,
    transcodingError: null,
  });

  // Safety-net: single delayed check in case webhook delivery fails
  await addCheckTranscodingStatusJob({
    lessonContentId,
    videoStreamId: result.uid,
    attempt: MAX_CHECK_ATTEMPTS, // Won't re-queue — marks ERROR if still pending
  }, SAFETY_NET_DELAY_MS);

  logger.info({ jobId: job.id, lessonContentId, streamUid: result.uid }, 'Transcoding submitted, awaiting webhook');
}

async function processCheckStatus(job: Job<CheckTranscodingStatusJobData>): Promise<void> {
  const { lessonContentId, videoStreamId, attempt } = job.data;

  logger.info({ jobId: job.id, lessonContentId, videoStreamId, attempt }, 'Checking transcoding status');

  const content = await LessonContent.findByPk(lessonContentId);
  if (!content) {
    logger.warn({ lessonContentId }, 'LessonContent not found, stopping status check');
    return;
  }

  // Skip if webhook already resolved this
  if (content.transcodingStatus === TranscodingStatus.READY ||
      content.transcodingStatus === TranscodingStatus.ERROR) {
    logger.info({ lessonContentId, status: content.transcodingStatus }, 'Already terminal, skipping check');
    return;
  }

  const transcoding = getTranscoding();
  const status = await transcoding.getStatus(videoStreamId);

  switch (status.status) {
    case 'ready': {
      await content.update({
        transcodingStatus: TranscodingStatus.READY,
        videoPlaybackUrl: status.playbackUrl || null,
        videoThumbnailUrl: status.thumbnailUrl || null,
        transcodingError: null,
      });

      // Update lesson duration if we got it from the transcoder
      if (status.duration && status.duration > 0) {
        await Lesson.update(
          { duration: status.duration },
          { where: { id: content.lessonId } }
        );
      }

      logger.info({ lessonContentId, videoStreamId, playbackUrl: status.playbackUrl }, 'Transcoding ready');
      break;
    }

    case 'error': {
      await content.update({
        transcodingStatus: TranscodingStatus.ERROR,
        transcodingError: status.errorMessage || 'Unknown transcoding error',
      });
      logger.error({ lessonContentId, videoStreamId, error: status.errorMessage }, 'Transcoding failed');
      break;
    }

    case 'pending':
    case 'processing': {
      if (attempt >= MAX_CHECK_ATTEMPTS) {
        await content.update({
          transcodingStatus: TranscodingStatus.ERROR,
          transcodingError: 'Transcoding timed out after 30 minutes',
        });
        logger.error({ lessonContentId, videoStreamId, attempt }, 'Transcoding timed out');
        return;
      }

      await addCheckTranscodingStatusJob({
        lessonContentId,
        videoStreamId,
        attempt: attempt + 1,
      }, CHECK_DELAY_MS);

      logger.debug({ lessonContentId, videoStreamId, attempt, status: status.status }, 'Transcoding still in progress');
      break;
    }
  }
}

async function processTranscodingJob(job: Job<TranscodingJobData>): Promise<void> {
  switch (job.data.type) {
    case 'submit-transcoding':
      return processSubmitTranscoding(job as Job<SubmitTranscodingJobData>);
    case 'check-transcoding-status':
      return processCheckStatus(job as Job<CheckTranscodingStatusJobData>);
    default:
      logger.warn({ jobData: job.data }, 'Unknown transcoding job type');
  }
}

let worker: Worker | null = null;

export function startTranscodingWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker<TranscodingJobData>(TRANSCODING_QUEUE_NAME, processTranscodingJob, {
    connection: queueConnection,
    concurrency: config.queue.concurrency,
  });

  worker.on('completed', (job: Job<TranscodingJobData>) => {
    logger.debug({ jobId: job.id, type: job.data.type }, 'Transcoding job completed');
  });

  worker.on('failed', (job: Job<TranscodingJobData> | undefined, error: Error) => {
    logger.error(
      { jobId: job?.id, type: job?.data?.type, error: error.message },
      'Transcoding job failed'
    );
  });

  logger.info({ concurrency: config.queue.concurrency }, 'Transcoding worker started');
  return worker;
}

export async function stopTranscodingWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Transcoding worker stopped');
  }
}

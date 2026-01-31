import { Worker, type Job } from 'bullmq';
import { queueConnection } from '../connection.js';
import {
  DIGEST_QUEUE_NAME,
  addDigestJob,
  type DigestJobData,
  type DigestTriggerJobData,
} from '../digest.queue.js';
import { DigestFrequency } from '../../database/models/enums.js';
import { User } from '../../database/models/index.js';
import { notificationService, preferenceService } from '../../services/notifications/index.js';
import { emailService } from '../../services/email/index.js';
import type { DigestNotificationItem } from '../../services/email/templates/digest/weekly-digest.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

function getDigestPeriod(frequency: DigestFrequency): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);

  let start: Date;
  if (frequency === DigestFrequency.DAILY) {
    start = new Date(now);
    start.setDate(start.getDate() - 1);
  } else {
    // Weekly
    start = new Date(now);
    start.setDate(start.getDate() - 7);
  }

  // Set to beginning of day for start
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

async function processTriggerDigests(job: Job<DigestTriggerJobData>): Promise<void> {
  const { frequency, dayOfWeek } = job.data;

  logger.info({ frequency, dayOfWeek }, 'Triggering digest emails');

  const preferences = await preferenceService.getUsersForDigest(
    frequency,
    frequency === DigestFrequency.WEEKLY ? dayOfWeek : undefined
  );

  logger.info({ count: preferences.length, frequency }, 'Found users for digest');

  for (const pref of preferences) {
    const user = await User.findByPk(pref.userId, {
      attributes: ['id', 'email', 'firstName', 'locale'],
    });

    if (user) {
      await addDigestJob({
        userId: user.id,
        userEmail: user.email,
        userFirstName: user.firstName,
        frequency,
        locale: user.locale,
      });
    }
  }
}

async function processSendDigest(job: Job<DigestJobData>): Promise<void> {
  const { userId, userEmail, userFirstName, frequency, locale } = job.data;

  logger.info({ jobId: job.id, userId, frequency, locale }, 'Processing digest email job');

  try {
    const { start, end } = getDigestPeriod(frequency);

    const notifications = await notificationService.getRecentUnread(userId, start);

    if (notifications.length === 0) {
      logger.debug({ userId }, 'No notifications for digest, skipping');
      return;
    }

    const digestItems: DigestNotificationItem[] = notifications.map((n) => ({
      type: n.type,
      title: n.title,
      message: n.message || '',
      link: n.link ? `${config.frontendUrl}${n.link}` : `${config.frontendUrl}/notifications`,
      createdAt: n.createdAt,
    }));

    await emailService.sendDigestEmail({
      to: userEmail,
      firstName: userFirstName,
      notifications: digestItems,
      dashboardUrl: `${config.frontendUrl}/dashboard`,
      settingsUrl: `${config.frontendUrl}/settings/notifications`,
      weekStart: start,
      weekEnd: end,
      locale,
    });

    logger.info({ jobId: job.id, userId, notificationCount: notifications.length, locale }, 'Digest email sent');
  } catch (error) {
    logger.error(
      { jobId: job.id, userId, locale, error: error instanceof Error ? error.message : 'Unknown' },
      'Failed to process digest email'
    );
    throw error;
  }
}

async function processDigestJob(job: Job<DigestJobData | DigestTriggerJobData>): Promise<void> {
  if (job.name === 'trigger-digests') {
    await processTriggerDigests(job as Job<DigestTriggerJobData>);
  } else {
    await processSendDigest(job as Job<DigestJobData>);
  }
}

let worker: Worker | null = null;

export function startDigestWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker<DigestJobData | DigestTriggerJobData>(DIGEST_QUEUE_NAME, processDigestJob, {
    connection: queueConnection,
    concurrency: config.queue.concurrency,
  });

  worker.on('completed', (job: Job<DigestJobData | DigestTriggerJobData>) => {
    logger.debug({ jobId: job.id, name: job.name }, 'Digest job completed');
  });

  worker.on('failed', (job: Job<DigestJobData | DigestTriggerJobData> | undefined, error: Error) => {
    logger.error(
      { jobId: job?.id, name: job?.name, error: error.message },
      'Digest job failed'
    );
  });

  logger.info({ concurrency: config.queue.concurrency }, 'Digest worker started');

  return worker;
}

export async function stopDigestWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Digest worker stopped');
  }
}

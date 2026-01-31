import { Worker, type Job } from 'bullmq';
import { queueConnection } from '../connection.js';
import { NOTIFICATION_QUEUE_NAME, type NotificationEmailJobData } from '../notification.queue.js';
import { NotificationType } from '../../database/models/enums.js';
import { Course, Lesson, Badge } from '../../database/models/index.js';
import { emailService } from '../../services/email/index.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

async function processNotificationEmail(job: Job<NotificationEmailJobData>): Promise<void> {
  const { userId, userEmail, userFirstName, type, data, locale } = job.data;

  logger.info({ jobId: job.id, userId, type, locale }, 'Processing notification email job');

  try {
    switch (type) {
      case NotificationType.LESSON_COMPLETED: {
        const lesson = data.lessonId
          ? await Lesson.findByPk(data.lessonId, { attributes: ['title'] })
          : null;
        const course = data.courseId
          ? await Course.findByPk(data.courseId, { attributes: ['title'] })
          : null;

        await emailService.sendNotificationEmail({
          to: userEmail,
          firstName: userFirstName,
          type: 'lesson_completed',
          locale,
          lessonName: lesson?.title || data.lessonName || 'a lesson',
          courseName: course?.title || data.courseName || 'your course',
          courseUrl: data.courseId
            ? `${config.frontendUrl}/courses/${data.courseId}`
            : `${config.frontendUrl}/dashboard`,
        });
        break;
      }

      case NotificationType.COURSE_COMPLETED: {
        const course = data.courseId
          ? await Course.findByPk(data.courseId, { attributes: ['title'] })
          : null;

        await emailService.sendNotificationEmail({
          to: userEmail,
          firstName: userFirstName,
          type: 'course_completed',
          locale,
          courseName: course?.title || data.courseName || 'your course',
          dashboardUrl: `${config.frontendUrl}/dashboard`,
          certificateUrl: data.courseId
            ? `${config.frontendUrl}/certificates/${data.courseId}`
            : undefined,
        });
        break;
      }

      case NotificationType.BADGE_EARNED: {
        const badge = data.badgeId
          ? await Badge.findByPk(data.badgeId, { attributes: ['name', 'description', 'imageUrl'] })
          : null;

        await emailService.sendNotificationEmail({
          to: userEmail,
          firstName: userFirstName,
          type: 'badge_earned',
          locale,
          badgeName: badge?.name || data.badgeName || 'a badge',
          badgeDescription: badge?.description || '',
          badgeIconUrl: badge?.imageUrl || undefined,
          profileUrl: `${config.frontendUrl}/profile/badges`,
        });
        break;
      }

      case NotificationType.QUIZ_PASSED:
      case NotificationType.DISCUSSION_REPLY:
      case NotificationType.PURCHASE_CONFIRMED:
        // These notification types don't have dedicated email templates yet
        // They could be added later or handled with a generic template
        logger.debug({ type }, 'Notification type does not have email template, skipping');
        break;

      default:
        logger.warn({ type }, 'Unknown notification type for email');
    }

    logger.info({ jobId: job.id, userId, type, locale }, 'Notification email processed');
  } catch (error) {
    logger.error(
      { jobId: job.id, userId, type, locale, error: error instanceof Error ? error.message : 'Unknown' },
      'Failed to process notification email'
    );
    throw error;
  }
}

let worker: Worker | null = null;

export function startNotificationWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker<NotificationEmailJobData>(NOTIFICATION_QUEUE_NAME, processNotificationEmail, {
    connection: queueConnection,
    concurrency: config.queue.concurrency,
  });

  worker.on('completed', (job: Job<NotificationEmailJobData>) => {
    logger.debug({ jobId: job.id }, 'Notification email job completed');
  });

  worker.on('failed', (job: Job<NotificationEmailJobData> | undefined, error: Error) => {
    logger.error(
      { jobId: job?.id, error: error.message },
      'Notification email job failed'
    );
  });

  logger.info({ concurrency: config.queue.concurrency }, 'Notification worker started');

  return worker;
}

export async function stopNotificationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Notification worker stopped');
  }
}

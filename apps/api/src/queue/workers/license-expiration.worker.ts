import { Worker, type Job } from 'bullmq';
import { Op } from 'sequelize';
import { queueConnection } from '../connection.js';
import { LICENSE_EXPIRATION_QUEUE_NAME } from '../license-expiration.queue.js';
import { TenantCourseLicense } from '../../database/models/TenantCourseLicense.js';
import { Course } from '../../database/models/index.js';
import { PurchaseStatus, NotificationType } from '../../database/models/enums.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { notificationService } from '../../services/notifications/notification.service.js';

async function processLicenseExpiration(_job: Job): Promise<void> {
  if (!config.licensing.enableExpiration) {
    logger.debug('License expiration is disabled, skipping');
    return;
  }

  const now = new Date();

  // 1. Mark expired licenses
  const [expiredCount] = await TenantCourseLicense.update(
    { status: PurchaseStatus.EXPIRED },
    {
      where: {
        status: PurchaseStatus.COMPLETED,
        expiresAt: { [Op.lte]: now },
      },
    }
  );

  if (expiredCount > 0) {
    logger.info({ count: expiredCount }, 'Licenses marked as expired');
  }

  // 2. Send expiring soon notifications
  for (const days of config.licensing.expirationWarningDays) {
    const warningDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const dayStart = new Date(warningDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(warningDate);
    dayEnd.setHours(23, 59, 59, 999);

    const expiringLicenses = await TenantCourseLicense.findAll({
      where: {
        status: PurchaseStatus.COMPLETED,
        expiresAt: { [Op.between]: [dayStart, dayEnd] },
      },
      include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
    });

    for (const license of expiringLicenses) {
      try {
        await notificationService.send({
          userId: license.purchasedById,
          type: NotificationType.LICENSE_EXPIRING_SOON,
          data: {
            licenseId: license.id,
            courseId: license.courseId,
            courseName: license.course?.title,
            daysUntilExpiration: days,
          },
        });
      } catch (err) {
        logger.error(
          { licenseId: license.id, error: err instanceof Error ? err.message : 'Unknown' },
          'Failed to send license expiration warning'
        );
      }
    }

    if (expiringLicenses.length > 0) {
      logger.info(
        { days, count: expiringLicenses.length },
        'License expiration warnings sent'
      );
    }
  }

  // 3. Notify about newly expired licenses
  const justExpiredLicenses = await TenantCourseLicense.findAll({
    where: {
      status: PurchaseStatus.EXPIRED,
      expiresAt: {
        [Op.between]: [
          new Date(now.getTime() - 24 * 60 * 60 * 1000),
          now,
        ],
      },
    },
    include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
  });

  for (const license of justExpiredLicenses) {
    try {
      await notificationService.send({
        userId: license.purchasedById,
        type: NotificationType.LICENSE_EXPIRED,
        data: {
          licenseId: license.id,
          courseId: license.courseId,
          courseName: license.course?.title,
        },
      });
    } catch (err) {
      logger.error(
        { licenseId: license.id, error: err instanceof Error ? err.message : 'Unknown' },
        'Failed to send license expired notification'
      );
    }
  }
}

let worker: Worker | null = null;

export function startLicenseExpirationWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker(LICENSE_EXPIRATION_QUEUE_NAME, processLicenseExpiration, {
    connection: queueConnection,
    concurrency: 1,
  });

  worker.on('completed', (job: Job) => {
    logger.debug({ jobId: job.id }, 'License expiration job completed');
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    logger.error(
      { jobId: job?.id, error: error.message },
      'License expiration job failed'
    );
  });

  logger.info('License expiration worker started');

  return worker;
}

export async function stopLicenseExpirationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('License expiration worker stopped');
  }
}

export async function scheduleLicenseExpirationCheck(): Promise<void> {
  const { licenseExpirationQueue } = await import('../license-expiration.queue.js');
  await licenseExpirationQueue.add(
    'check-expiration',
    {},
    {
      repeat: {
        pattern: '0 2 * * *', // Daily at 2:00 AM
      },
    }
  );
  logger.info('License expiration cron job scheduled (daily at 2:00 AM)');
}

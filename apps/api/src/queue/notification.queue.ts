import { Queue } from 'bullmq';
import { queueConnection } from './connection.js';
import type { NotificationType, SupportedLocale } from '../database/models/enums.js';
import type { NotificationData } from '../database/models/Notification.js';

export const NOTIFICATION_QUEUE_NAME = 'notifications';

export interface NotificationEmailJobData {
  userId: string;
  userEmail: string;
  userFirstName: string;
  type: NotificationType;
  data: NotificationData;
  locale: SupportedLocale;
}

export const notificationQueue = new Queue<NotificationEmailJobData>(NOTIFICATION_QUEUE_NAME, {
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

export async function addNotificationEmailJob(data: NotificationEmailJobData): Promise<void> {
  await notificationQueue.add('send-email', data);
}

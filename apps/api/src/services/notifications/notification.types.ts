import type { NotificationType } from '../../database/models/enums.js';
import type { NotificationData } from '../../database/models/Notification.js';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: NotificationData;
  link?: string;
}

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  data: NotificationData;
  link: string | null;
  read: boolean;
  createdAt: Date;
}

export interface GetNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface GetNotificationsResult {
  notifications: NotificationPayload[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SendNotificationInput {
  userId: string;
  type: NotificationType;
  data: NotificationData;
}

export const NOTIFICATION_CHANNEL_PREFIX = 'notifications:user:';

import { Op } from 'sequelize';
import { Notification, User, Course, Lesson, Badge } from '../../database/models/index.js';
import { NotificationType, SupportedLocale } from '../../database/models/enums.js';
import type { NotificationData } from '../../database/models/Notification.js';
import { logger } from '../../utils/logger.js';
import { publishNotification } from './pubsub.service.js';
import { preferenceService } from './preference.service.js';
import { addNotificationEmailJob } from '../../queue/index.js';
import { getNotificationText } from '../../i18n/index.js';
import type {
  CreateNotificationInput,
  NotificationPayload,
  GetNotificationsOptions,
  GetNotificationsResult,
  SendNotificationInput,
} from './notification.types.js';

class NotificationService {
  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification = await Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data || {},
      link: input.link,
    });

    // Publish to Redis for SSE
    const payload = this.toPayload(notification);
    await publishNotification(input.userId, payload);

    logger.info(
      { userId: input.userId, type: input.type, notificationId: notification.id },
      'Notification created'
    );

    return notification;
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const notification = await Notification.findOne({
      where: { id, userId },
    });

    if (!notification) {
      return null;
    }

    if (!notification.read) {
      await notification.update({
        read: true,
        readAt: new Date(),
      });
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const [affectedCount] = await Notification.update(
      {
        read: true,
        readAt: new Date(),
      },
      {
        where: {
          userId,
          read: false,
        },
      }
    );

    if (affectedCount > 0) {
      logger.info({ userId, count: affectedCount }, 'Marked all notifications as read');
    }

    return affectedCount;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const deleted = await Notification.destroy({
      where: { id, userId },
    });

    return deleted > 0;
  }

  async getUserNotifications(
    userId: string,
    options: GetNotificationsOptions = {}
  ): Promise<GetNotificationsResult> {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const offset = (page - 1) * limit;

    const where: { userId: string; read?: boolean } = { userId };
    if (unreadOnly) {
      where.read = false;
    }

    const { rows, count } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      notifications: rows.map((n) => this.toPayload(n)),
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  async getRecentUnread(userId: string, since: Date): Promise<Notification[]> {
    return Notification.findAll({
      where: {
        userId,
        read: false,
        createdAt: {
          [Op.gte]: since,
        },
      },
      order: [['createdAt', 'DESC']],
    });
  }

  async send(input: SendNotificationInput): Promise<void> {
    const { userId, type, data } = input;

    // Get user to fetch their locale preference
    const user = await User.findByPk(userId, {
      attributes: ['email', 'firstName', 'locale'],
    });

    if (!user) {
      logger.warn({ userId }, 'User not found for notification');
      return;
    }

    const locale = user.locale || SupportedLocale.EN;

    // Check in-app preference
    const inAppEnabled = await preferenceService.isInAppEnabled(userId, type);

    if (inAppEnabled) {
      const { title, message, link } = await this.buildNotificationContent(type, data, locale);

      await this.create({
        userId,
        type,
        title,
        message,
        data,
        link,
      });
    }

    // Check email preference and queue email job
    const emailEnabled = await preferenceService.isEmailEnabled(userId, type);

    if (emailEnabled) {
      await addNotificationEmailJob({
        userId,
        userEmail: user.email,
        userFirstName: user.firstName,
        type,
        data,
        locale,
      });
      logger.debug({ userId, type, locale }, 'Email notification job queued');
    }
  }

  private async buildNotificationContent(
    type: NotificationType,
    data: NotificationData,
    locale: SupportedLocale = SupportedLocale.EN
  ): Promise<{ title: string; message: string; link: string }> {
    // Enrich data with database lookups for names
    const enrichedData = { ...data };

    switch (type) {
      case NotificationType.LESSON_COMPLETED:
      case NotificationType.QUIZ_PASSED: {
        if (data.lessonId && !data.lessonName) {
          const lesson = await Lesson.findByPk(data.lessonId, { attributes: ['title'] });
          if (lesson) enrichedData.lessonName = lesson.title;
        }
        break;
      }
      case NotificationType.COURSE_COMPLETED:
      case NotificationType.PURCHASE_CONFIRMED: {
        if (data.courseId && !data.courseName) {
          const course = await Course.findByPk(data.courseId, { attributes: ['title'] });
          if (course) enrichedData.courseName = course.title;
        }
        break;
      }
      case NotificationType.BADGE_EARNED: {
        if (data.badgeId && !data.badgeName) {
          const badge = await Badge.findByPk(data.badgeId, { attributes: ['name'] });
          if (badge) enrichedData.badgeName = badge.name;
        }
        break;
      }
      case NotificationType.LICENSE_EXPIRING_SOON:
      case NotificationType.LICENSE_EXPIRED: {
        if (data.courseId && !data.courseName) {
          const course = await Course.findByPk(data.courseId, { attributes: ['title'] });
          if (course) enrichedData.courseName = course.title;
        }
        break;
      }
    }

    // Get translated title and message
    const { title, message } = getNotificationText(locale, type, enrichedData);

    // Determine link based on notification type
    let link: string;
    switch (type) {
      case NotificationType.LESSON_COMPLETED:
      case NotificationType.COURSE_COMPLETED:
      case NotificationType.QUIZ_PASSED:
        link = data.courseId ? `/courses/${data.courseId}` : '/dashboard';
        break;
      case NotificationType.BADGE_EARNED:
        link = '/profile/badges';
        break;
      case NotificationType.DISCUSSION_REPLY:
        link = data.discussionId ? `/discussions/${data.discussionId}` : '/discussions';
        break;
      case NotificationType.PURCHASE_CONFIRMED:
        link = data.courseId ? `/courses/${data.courseId}` : '/my-courses';
        break;
      case NotificationType.LICENSE_EXPIRING_SOON:
      case NotificationType.LICENSE_EXPIRED:
        link = data.licenseId ? `/admin/licenses/${data.licenseId}` : '/admin/licenses';
        break;
      default:
        link = '/notifications';
    }

    return { title, message, link };
  }

  private toPayload(notification: Notification): NotificationPayload {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      link: notification.link,
      read: notification.read,
      createdAt: notification.createdAt,
    };
  }
}

export const notificationService = new NotificationService();

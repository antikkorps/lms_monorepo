import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationType, DigestFrequency } from '../../database/models/enums.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockNotification = {
  id: 'notif-123',
  userId: 'user-123',
  type: NotificationType.LESSON_COMPLETED,
  title: 'Lesson Completed',
  message: 'You completed "Intro to Testing"',
  data: { lessonId: 'lesson-1', courseId: 'course-1' },
  link: '/courses/course-1',
  read: false,
  readAt: null,
  createdAt: new Date('2024-01-01'),
  update: vi.fn().mockResolvedValue(undefined),
};

const mockNotificationModel = {
  create: vi.fn().mockResolvedValue(mockNotification),
  findOne: vi.fn().mockResolvedValue(mockNotification),
  findAll: vi.fn().mockResolvedValue([mockNotification]),
  findAndCountAll: vi.fn().mockResolvedValue({ rows: [mockNotification], count: 1 }),
  count: vi.fn().mockResolvedValue(5),
  update: vi.fn().mockResolvedValue([1]),
  destroy: vi.fn().mockResolvedValue(1),
};

const mockUserModel = {
  findByPk: vi.fn().mockResolvedValue({
    email: 'user@test.com',
    firstName: 'John',
  }),
};

const mockLessonModel = {
  findByPk: vi.fn().mockResolvedValue({ title: 'Intro to Testing' }),
};

const mockCourseModel = {
  findByPk: vi.fn().mockResolvedValue({ title: 'Test Course' }),
};

const mockBadgeModel = {
  findByPk: vi.fn().mockResolvedValue({ name: 'First Steps' }),
};

const mockPublishNotification = vi.fn().mockResolvedValue(undefined);

const mockPreferenceService = {
  isInAppEnabled: vi.fn().mockResolvedValue(true),
  isEmailEnabled: vi.fn().mockResolvedValue(true),
};

const mockAddNotificationEmailJob = vi.fn().mockResolvedValue(undefined);

vi.mock('../../database/models/index.js', () => ({
  Notification: mockNotificationModel,
  User: mockUserModel,
  Course: mockCourseModel,
  Lesson: mockLessonModel,
  Badge: mockBadgeModel,
}));

vi.mock('./pubsub.service.js', () => ({
  publishNotification: mockPublishNotification,
}));

vi.mock('./preference.service.js', () => ({
  preferenceService: mockPreferenceService,
}));

vi.mock('../../queue/index.js', () => ({
  addNotificationEmailJob: mockAddNotificationEmailJob,
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a notification and publish to Redis', async () => {
      const { notificationService } = await import('./notification.service.js');

      const result = await notificationService.create({
        userId: 'user-123',
        type: NotificationType.LESSON_COMPLETED,
        title: 'Lesson Completed',
        message: 'You completed "Intro to Testing"',
        data: { lessonId: 'lesson-1', courseId: 'course-1' },
        link: '/courses/course-1',
      });

      expect(mockNotificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: NotificationType.LESSON_COMPLETED,
          title: 'Lesson Completed',
        })
      );

      expect(mockPublishNotification).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          id: 'notif-123',
          type: NotificationType.LESSON_COMPLETED,
        })
      );

      expect(result).toBe(mockNotification);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const { notificationService } = await import('./notification.service.js');

      const result = await notificationService.markAsRead('notif-123', 'user-123');

      expect(mockNotificationModel.findOne).toHaveBeenCalledWith({
        where: { id: 'notif-123', userId: 'user-123' },
      });

      expect(mockNotification.update).toHaveBeenCalledWith({
        read: true,
        readAt: expect.any(Date),
      });

      expect(result).toBe(mockNotification);
    });

    it('should return null if notification not found', async () => {
      mockNotificationModel.findOne.mockResolvedValueOnce(null);

      const { notificationService } = await import('./notification.service.js');

      const result = await notificationService.markAsRead('nonexistent', 'user-123');

      expect(result).toBeNull();
    });

    it('should not update if already read', async () => {
      const readNotification = {
        ...mockNotification,
        read: true,
        readAt: new Date(),
        update: vi.fn(),
      };
      mockNotificationModel.findOne.mockResolvedValueOnce(readNotification);

      const { notificationService } = await import('./notification.service.js');

      await notificationService.markAsRead('notif-123', 'user-123');

      expect(readNotification.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      const { notificationService } = await import('./notification.service.js');

      const count = await notificationService.markAllAsRead('user-123');

      expect(mockNotificationModel.update).toHaveBeenCalledWith(
        { read: true, readAt: expect.any(Date) },
        { where: { userId: 'user-123', read: false } }
      );

      expect(count).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      const { notificationService } = await import('./notification.service.js');

      const result = await notificationService.delete('notif-123', 'user-123');

      expect(mockNotificationModel.destroy).toHaveBeenCalledWith({
        where: { id: 'notif-123', userId: 'user-123' },
      });

      expect(result).toBe(true);
    });

    it('should return false if notification not found', async () => {
      mockNotificationModel.destroy.mockResolvedValueOnce(0);

      const { notificationService } = await import('./notification.service.js');

      const result = await notificationService.delete('nonexistent', 'user-123');

      expect(result).toBe(false);
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications', async () => {
      const { notificationService } = await import('./notification.service.js');

      const result = await notificationService.getUserNotifications('user-123', {
        page: 1,
        limit: 10,
      });

      expect(mockNotificationModel.findAndCountAll).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: [['createdAt', 'DESC']],
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual({
        notifications: expect.arrayContaining([
          expect.objectContaining({ id: 'notif-123' }),
        ]),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter by unread only when specified', async () => {
      const { notificationService } = await import('./notification.service.js');

      await notificationService.getUserNotifications('user-123', {
        unreadOnly: true,
      });

      expect(mockNotificationModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123', read: false },
        })
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      const { notificationService } = await import('./notification.service.js');

      const count = await notificationService.getUnreadCount('user-123');

      expect(mockNotificationModel.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', read: false },
      });

      expect(count).toBe(5);
    });
  });

  describe('send', () => {
    it('should create in-app notification when in-app is enabled', async () => {
      mockPreferenceService.isInAppEnabled.mockResolvedValueOnce(true);
      mockPreferenceService.isEmailEnabled.mockResolvedValueOnce(false);

      const { notificationService } = await import('./notification.service.js');

      await notificationService.send({
        userId: 'user-123',
        type: NotificationType.LESSON_COMPLETED,
        data: { lessonId: 'lesson-1', courseId: 'course-1' },
      });

      expect(mockNotificationModel.create).toHaveBeenCalled();
      expect(mockAddNotificationEmailJob).not.toHaveBeenCalled();
    });

    it('should queue email when email is enabled', async () => {
      mockPreferenceService.isInAppEnabled.mockResolvedValueOnce(false);
      mockPreferenceService.isEmailEnabled.mockResolvedValueOnce(true);

      const { notificationService } = await import('./notification.service.js');

      await notificationService.send({
        userId: 'user-123',
        type: NotificationType.COURSE_COMPLETED,
        data: { courseId: 'course-1' },
      });

      expect(mockAddNotificationEmailJob).toHaveBeenCalledWith({
        userId: 'user-123',
        userEmail: 'user@test.com',
        userFirstName: 'John',
        type: NotificationType.COURSE_COMPLETED,
        data: { courseId: 'course-1' },
        locale: 'en',
      });
    });

    it('should not send anything when both are disabled', async () => {
      mockPreferenceService.isInAppEnabled.mockResolvedValueOnce(false);
      mockPreferenceService.isEmailEnabled.mockResolvedValueOnce(false);

      const { notificationService } = await import('./notification.service.js');

      await notificationService.send({
        userId: 'user-123',
        type: NotificationType.BADGE_EARNED,
        data: { badgeId: 'badge-1' },
      });

      expect(mockNotificationModel.create).not.toHaveBeenCalled();
      expect(mockAddNotificationEmailJob).not.toHaveBeenCalled();
    });

    it('should send both when both are enabled', async () => {
      mockPreferenceService.isInAppEnabled.mockResolvedValueOnce(true);
      mockPreferenceService.isEmailEnabled.mockResolvedValueOnce(true);

      const { notificationService } = await import('./notification.service.js');

      await notificationService.send({
        userId: 'user-123',
        type: NotificationType.QUIZ_PASSED,
        data: { lessonId: 'lesson-1', courseId: 'course-1' },
      });

      expect(mockNotificationModel.create).toHaveBeenCalled();
      expect(mockAddNotificationEmailJob).toHaveBeenCalled();
    });
  });

  describe('buildNotificationContent', () => {
    it('should build lesson completed content', async () => {
      mockPreferenceService.isInAppEnabled.mockResolvedValueOnce(true);
      mockPreferenceService.isEmailEnabled.mockResolvedValueOnce(false);

      const { notificationService } = await import('./notification.service.js');

      await notificationService.send({
        userId: 'user-123',
        type: NotificationType.LESSON_COMPLETED,
        data: { lessonId: 'lesson-1', courseId: 'course-1' },
      });

      expect(mockNotificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Lesson Completed',
          message: 'You completed "Intro to Testing"',
        })
      );
    });

    it('should build badge earned content', async () => {
      mockPreferenceService.isInAppEnabled.mockResolvedValueOnce(true);
      mockPreferenceService.isEmailEnabled.mockResolvedValueOnce(false);

      const { notificationService } = await import('./notification.service.js');

      await notificationService.send({
        userId: 'user-123',
        type: NotificationType.BADGE_EARNED,
        data: { badgeId: 'badge-1' },
      });

      expect(mockNotificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Badge Earned!',
          message: 'You earned the "First Steps" badge',
          link: '/profile/badges',
        })
      );
    });

    it('should build discussion reply content', async () => {
      mockPreferenceService.isInAppEnabled.mockResolvedValueOnce(true);
      mockPreferenceService.isEmailEnabled.mockResolvedValueOnce(false);

      const { notificationService } = await import('./notification.service.js');

      await notificationService.send({
        userId: 'user-123',
        type: NotificationType.DISCUSSION_REPLY,
        data: { discussionId: 'disc-1', authorName: 'Jane Doe' },
      });

      expect(mockNotificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Reply',
          message: 'Jane Doe replied to your discussion',
          link: '/discussions/disc-1',
        })
      );
    });
  });
});

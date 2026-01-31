import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { NotificationType, DigestFrequency, UserRole } from '../database/models/enums.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockNotificationService = {
  getUserNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  delete: vi.fn(),
};

const mockPreferenceService = {
  getOrCreate: vi.fn(),
  update: vi.fn(),
};

vi.mock('../services/notifications/index.js', () => ({
  notificationService: mockNotificationService,
  preferenceService: mockPreferenceService,
}));

vi.mock('../utils/app-error.js', () => ({
  AppError: {
    unauthorized: (msg: string) => ({ status: 401, message: msg }),
    notFound: (msg: string) => ({ status: 404, message: msg }),
  },
}));

// =============================================================================
// Test Helpers
// =============================================================================

function createMockContext(overrides: Partial<Context> = {}): Context {
  return {
    state: {
      user: {
        userId: 'user-123',
        email: 'user@test.com',
        role: UserRole.LEARNER,
        tenantId: 'tenant-1',
      },
    },
    query: {},
    params: {},
    request: { body: {} },
    body: undefined,
    status: 200,
    ...overrides,
  } as unknown as Context;
}

// =============================================================================
// Tests
// =============================================================================

describe('NotificationsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockResult = {
        notifications: [
          {
            id: 'notif-1',
            type: NotificationType.LESSON_COMPLETED,
            title: 'Lesson Completed',
            read: false,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockNotificationService.getUserNotifications.mockResolvedValue(mockResult);

      const ctx = createMockContext({
        query: { page: '1', limit: '20' },
      });

      const { listNotifications } = await import('./controller.js');
      await listNotifications(ctx);

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('user-123', {
        page: '1',
        limit: '20',
        unreadOnly: undefined,
      });

      expect(ctx.body).toEqual({
        success: true,
        data: {
          notifications: mockResult.notifications,
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        },
      });
    });

    it('should filter by unread only', async () => {
      mockNotificationService.getUserNotifications.mockResolvedValue({
        notifications: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const ctx = createMockContext({
        query: { unreadOnly: 'true' },
      });

      const { listNotifications } = await import('./controller.js');
      await listNotifications(ctx);

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ unreadOnly: 'true' })
      );
    });

    it('should throw unauthorized without user', async () => {
      const ctx = createMockContext({ state: {} });

      const { listNotifications } = await import('./controller.js');

      await expect(listNotifications(ctx)).rejects.toEqual({
        status: 401,
        message: 'Authentication required',
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockNotificationService.getUnreadCount.mockResolvedValue(5);

      const ctx = createMockContext();

      const { getUnreadCount } = await import('./controller.js');
      await getUnreadCount(ctx);

      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith('user-123');
      expect(ctx.body).toEqual({
        data: { unreadCount: 5 },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = {
        id: 'notif-1',
        read: true,
        readAt: new Date('2024-01-01'),
      };
      mockNotificationService.markAsRead.mockResolvedValue(mockNotification);

      const ctx = createMockContext({
        params: { id: 'notif-1' },
      });

      const { markAsRead } = await import('./controller.js');
      await markAsRead(ctx);

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('notif-1', 'user-123');
      expect(ctx.body).toEqual({
        data: {
          id: 'notif-1',
          read: true,
          readAt: mockNotification.readAt,
        },
      });
    });

    it('should throw not found if notification does not exist', async () => {
      mockNotificationService.markAsRead.mockResolvedValue(null);

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
      });

      const { markAsRead } = await import('./controller.js');

      await expect(markAsRead(ctx)).rejects.toEqual({
        status: 404,
        message: 'Notification not found',
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue(10);

      const ctx = createMockContext();

      const { markAllAsRead } = await import('./controller.js');
      await markAllAsRead(ctx);

      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith('user-123');
      expect(ctx.body).toEqual({
        data: { markedCount: 10 },
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      mockNotificationService.delete.mockResolvedValue(true);

      const ctx = createMockContext({
        params: { id: 'notif-1' },
      });

      const { deleteNotification } = await import('./controller.js');
      await deleteNotification(ctx);

      expect(mockNotificationService.delete).toHaveBeenCalledWith('notif-1', 'user-123');
      expect(ctx.status).toBe(204);
    });

    it('should throw not found if notification does not exist', async () => {
      mockNotificationService.delete.mockResolvedValue(false);

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
      });

      const { deleteNotification } = await import('./controller.js');

      await expect(deleteNotification(ctx)).rejects.toEqual({
        status: 404,
        message: 'Notification not found',
      });
    });
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      const mockPreferences = {
        emailEnabled: { lesson_completed: true },
        inAppEnabled: { lesson_completed: true },
        digestFrequency: DigestFrequency.WEEKLY,
        digestDay: 1,
      };
      mockPreferenceService.getOrCreate.mockResolvedValue(mockPreferences);

      const ctx = createMockContext();

      const { getPreferences } = await import('./controller.js');
      await getPreferences(ctx);

      expect(mockPreferenceService.getOrCreate).toHaveBeenCalledWith('user-123');
      expect(ctx.body).toEqual({
        data: mockPreferences,
      });
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      const mockUpdatedPreferences = {
        emailEnabled: { lesson_completed: false },
        inAppEnabled: { lesson_completed: true },
        digestFrequency: DigestFrequency.DAILY,
        digestDay: 0,
      };
      mockPreferenceService.update.mockResolvedValue(mockUpdatedPreferences);

      const ctx = createMockContext({
        request: {
          body: {
            emailEnabled: { lesson_completed: false },
            digestFrequency: DigestFrequency.DAILY,
          },
        },
      });

      const { updatePreferences } = await import('./controller.js');
      await updatePreferences(ctx);

      expect(mockPreferenceService.update).toHaveBeenCalledWith('user-123', {
        emailEnabled: { lesson_completed: false },
        digestFrequency: DigestFrequency.DAILY,
      });
      expect(ctx.body).toEqual({
        data: mockUpdatedPreferences,
      });
    });
  });
});

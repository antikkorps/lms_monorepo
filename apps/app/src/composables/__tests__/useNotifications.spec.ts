import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// Module Mocks
// =============================================================================

const mockApiRequest = vi.fn();
const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockApiPatch = vi.fn();
const mockApiDelete = vi.fn();

vi.mock('../useApi', () => ({
  useApi: () => ({
    request: mockApiRequest,
    get: mockApiGet,
    post: mockApiPost,
    patch: mockApiPatch,
    delete: mockApiDelete,
  }),
}));

const mockToast = {
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock('../useToast', () => ({
  useToast: () => mockToast,
}));

// Mock onUnmounted
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    onUnmounted: vi.fn(),
  };
});

// Mock EventSource
class MockEventSource {
  url: string;
  listeners: Record<string, ((event: MessageEvent) => void)[]> = {};
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(event: string, callback: (event: MessageEvent) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  dispatchEvent(event: string, data?: unknown) {
    const listeners = this.listeners[event] || [];
    listeners.forEach((cb) => cb({ data: JSON.stringify(data) } as MessageEvent));
  }

  close = vi.fn();
}

// @ts-expect-error - Global mock
global.EventSource = MockEventSource;

// =============================================================================
// Tests
// =============================================================================

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchNotifications', () => {
    it('should fetch notifications and update state', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'lesson_completed',
          title: 'Lesson Completed',
          message: 'You completed Intro',
          read: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockApiGet.mockResolvedValue({
        notifications: mockNotifications,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const { useNotifications } = await import('../useNotifications');
      const { fetchNotifications, notifications, pagination, isLoading } = useNotifications();

      expect(isLoading.value).toBe(false);

      await fetchNotifications();

      expect(mockApiGet).toHaveBeenCalledWith('/notifications', {
        page: 1, limit: 20, unreadOnly: false,
      });

      expect(notifications.value).toHaveLength(1);
      expect(notifications.value[0].id).toBe('notif-1');
      expect(notifications.value[0].createdAt).toBeInstanceOf(Date);
      expect(pagination.value.total).toBe(1);
    });

    it('should filter by unread only', async () => {
      mockApiGet.mockResolvedValue({
        notifications: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      const { useNotifications } = await import('../useNotifications');
      const { fetchNotifications } = useNotifications();

      await fetchNotifications(1, true);

      expect(mockApiGet).toHaveBeenCalledWith('/notifications', {
        page: 1, limit: 20, unreadOnly: true,
      });
    });

    it('should handle fetch errors', async () => {
      mockApiGet.mockRejectedValue(new Error('Network error'));

      const { useNotifications } = await import('../useNotifications');
      const { fetchNotifications, error } = useNotifications();

      await fetchNotifications();

      expect(error.value).toBe('Network error');
    });
  });

  describe('fetchUnreadCount', () => {
    it('should fetch unread count', async () => {
      mockApiGet.mockResolvedValue({ unreadCount: 5 });

      const { useNotifications } = await import('../useNotifications');
      const { fetchUnreadCount, unreadCount } = useNotifications();

      await fetchUnreadCount();

      expect(mockApiGet).toHaveBeenCalledWith('/notifications/unread-count');
      expect(unreadCount.value).toBe(5);
    });

    it('should silently handle errors', async () => {
      mockApiGet.mockRejectedValue(new Error('Network error'));

      const { useNotifications } = await import('../useNotifications');
      const { fetchUnreadCount, unreadCount, error } = useNotifications();

      await fetchUnreadCount();

      // Should not set error for unread count failures
      expect(error.value).toBeNull();
      expect(unreadCount.value).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockApiGet.mockResolvedValue({
        notifications: [
          {
            id: 'notif-1',
            type: 'lesson_completed',
            title: 'Test',
            read: false,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      mockApiPatch.mockResolvedValue({});

      const { useNotifications } = await import('../useNotifications');
      const { fetchNotifications, markAsRead, notifications, unreadCount } = useNotifications();

      await fetchNotifications();
      unreadCount.value = 1;

      await markAsRead('notif-1');

      expect(mockApiPatch).toHaveBeenCalledWith('/notifications/notif-1/read');
      expect(notifications.value[0].read).toBe(true);
      expect(unreadCount.value).toBe(0);
    });

    it('should not decrement count for already read notifications', async () => {
      mockApiGet.mockResolvedValue({
        notifications: [
          {
            id: 'notif-1',
            type: 'lesson_completed',
            title: 'Test',
            read: true,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      mockApiPatch.mockResolvedValue({});

      const { useNotifications } = await import('../useNotifications');
      const { fetchNotifications, markAsRead, unreadCount } = useNotifications();

      await fetchNotifications();
      unreadCount.value = 0;

      await markAsRead('notif-1');

      expect(unreadCount.value).toBe(0);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockApiGet.mockResolvedValue({
        notifications: [
          {
            id: 'notif-1',
            type: 'lesson_completed',
            title: 'Test 1',
            read: false,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 'notif-2',
            type: 'course_completed',
            title: 'Test 2',
            read: false,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      });
      mockApiPost.mockResolvedValue({});

      const { useNotifications } = await import('../useNotifications');
      const { fetchNotifications, markAllAsRead, notifications, unreadCount } = useNotifications();

      await fetchNotifications();
      unreadCount.value = 2;

      await markAllAsRead();

      expect(mockApiPost).toHaveBeenCalledWith('/notifications/mark-all-read');
      expect(notifications.value.every((n) => n.read)).toBe(true);
      expect(unreadCount.value).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification and update state', async () => {
      mockApiGet.mockResolvedValue({
        notifications: [
          {
            id: 'notif-1',
            type: 'lesson_completed',
            title: 'Test',
            read: false,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      mockApiDelete.mockResolvedValue({});

      const { useNotifications } = await import('../useNotifications');
      const { fetchNotifications, deleteNotification, notifications, unreadCount } =
        useNotifications();

      await fetchNotifications();
      unreadCount.value = 1;

      await deleteNotification('notif-1');

      expect(mockApiDelete).toHaveBeenCalledWith('/notifications/notif-1');
      expect(notifications.value).toHaveLength(0);
      expect(unreadCount.value).toBe(0);
    });

    it('should not decrement count when deleting read notification', async () => {
      mockApiGet.mockResolvedValue({
        notifications: [
          {
            id: 'notif-1',
            type: 'lesson_completed',
            title: 'Test',
            read: true,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      mockApiDelete.mockResolvedValue({});

      const { useNotifications } = await import('../useNotifications');
      const { fetchNotifications, deleteNotification, unreadCount } = useNotifications();

      await fetchNotifications();
      unreadCount.value = 0;

      await deleteNotification('notif-1');

      expect(unreadCount.value).toBe(0);
    });
  });

  describe('computed properties', () => {
    it('should return recent notifications (max 5)', async () => {
      const mockNotifications = Array.from({ length: 10 }, (_, i) => ({
        id: `notif-${i}`,
        type: 'lesson_completed',
        title: `Test ${i}`,
        read: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      }));

      mockApiGet.mockResolvedValue({
        notifications: mockNotifications,
        pagination: { page: 1, limit: 20, total: 10, totalPages: 1 },
      });

      const { useNotifications } = await import('../useNotifications');
      const { fetchNotifications, recentNotifications } = useNotifications();

      await fetchNotifications();

      expect(recentNotifications.value).toHaveLength(5);
    });

    it('should return hasUnread as true when unread count > 0', async () => {
      const { useNotifications } = await import('../useNotifications');
      const { hasUnread, unreadCount } = useNotifications();

      expect(hasUnread.value).toBe(false);

      unreadCount.value = 1;

      expect(hasUnread.value).toBe(true);
    });
  });

  describe('getNotificationIcon', () => {
    it('should return correct icons for notification types', async () => {
      const { useNotifications } = await import('../useNotifications');
      const { getNotificationIcon } = useNotifications();

      expect(getNotificationIcon('lesson_completed')).toBe('check-circle');
      expect(getNotificationIcon('course_completed')).toBe('award');
      expect(getNotificationIcon('quiz_passed')).toBe('check-square');
      expect(getNotificationIcon('badge_earned')).toBe('award');
      expect(getNotificationIcon('discussion_reply')).toBe('message-circle');
      expect(getNotificationIcon('purchase_confirmed')).toBe('shopping-cart');
    });
  });

  describe('formatTimeAgo', () => {
    it('should format time ago correctly', async () => {
      const { useNotifications } = await import('../useNotifications');
      const { formatTimeAgo } = useNotifications();

      const now = new Date();

      // Just now
      expect(formatTimeAgo(now)).toBe('Just now');

      // Minutes ago
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(formatTimeAgo(fiveMinutesAgo)).toBe('5m ago');

      // Hours ago
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatTimeAgo(twoHoursAgo)).toBe('2h ago');

      // Days ago
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(formatTimeAgo(threeDaysAgo)).toBe('3d ago');

      // Older than a week
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      expect(formatTimeAgo(twoWeeksAgo)).toBe(twoWeeksAgo.toLocaleDateString());
    });
  });

  describe('SSE connection', () => {
    it('should handle connect and disconnect', async () => {
      const { useNotifications } = await import('../useNotifications');
      const { connectSSE, disconnectSSE, isConnected } = useNotifications();

      // Should start disconnected
      expect(isConnected.value).toBe(false);

      connectSSE();
      connectSSE(); // Second call should be ignored

      disconnectSSE();

      expect(isConnected.value).toBe(false);
    });
  });
});

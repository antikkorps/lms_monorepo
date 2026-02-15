/**
 * Notifications Composable
 * Manages user notifications with SSE real-time updates
 */

import { ref, computed, onUnmounted } from 'vue';
import { useApi } from './useApi';
import { useToast } from './useToast';
import { logger } from '../lib/logger';

export type NotificationType =
  | 'lesson_completed'
  | 'course_completed'
  | 'quiz_passed'
  | 'badge_earned'
  | 'discussion_reply'
  | 'purchase_confirmed';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, unknown>;
  link: string | null;
  read: boolean;
  createdAt: Date;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useNotifications() {
  const api = useApi();
  const toast = useToast();

  const notifications = ref<Notification[]>([]);
  const unreadCount = ref(0);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref<NotificationPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  let eventSource: EventSource | null = null;
  const isConnected = ref(false);

  const recentNotifications = computed(() => {
    return notifications.value.slice(0, 5);
  });

  const hasUnread = computed(() => unreadCount.value > 0);

  async function fetchNotifications(page = 1, unreadOnly = false): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      interface ApiResponse {
        notifications: Array<Omit<Notification, 'createdAt'> & { createdAt: string }>;
        pagination: NotificationPagination;
      }
      const response = await api.get<ApiResponse>('/notifications', {
        page,
        limit: 20,
        unreadOnly,
      });

      const data = response.notifications || [];
      notifications.value = data.map((n) => ({
        ...n,
        createdAt: new Date(n.createdAt),
      }));
      pagination.value = response.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load notifications';
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchUnreadCount(): Promise<void> {
    try {
      const response = await api.get<{ unreadCount: number }>('/notifications/unread-count');
      unreadCount.value = response.unreadCount;
    } catch {
      // Silently fail - unread count is not critical
    }
  }

  async function markAsRead(id: string): Promise<void> {
    try {
      await api.patch(`/notifications/${id}/read`);

      // Update local state
      const notification = notifications.value.find((n) => n.id === id);
      if (notification && !notification.read) {
        notification.read = true;
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to mark notification as read';
    }
  }

  async function markAllAsRead(): Promise<void> {
    try {
      await api.post('/notifications/mark-all-read');

      // Update local state
      notifications.value.forEach((n) => {
        n.read = true;
      });
      unreadCount.value = 0;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to mark all as read';
    }
  }

  async function deleteNotification(id: string): Promise<void> {
    try {
      await api.delete(`/notifications/${id}`);

      // Remove from local state
      const index = notifications.value.findIndex((n) => n.id === id);
      if (index !== -1) {
        const notification = notifications.value[index];
        if (!notification.read) {
          unreadCount.value = Math.max(0, unreadCount.value - 1);
        }
        notifications.value.splice(index, 1);
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete notification';
    }
  }

  function connectSSE(): void {
    if (eventSource || isConnected.value) {
      return;
    }

    eventSource = new EventSource('/api/v1/notifications/stream');

    eventSource.addEventListener('connected', () => {
      isConnected.value = true;
      logger.debug('[Notifications] SSE connected');
    });

    eventSource.addEventListener('notification', (event) => {
      try {
        const notification = JSON.parse(event.data) as Omit<Notification, 'createdAt'> & {
          createdAt: string;
        };

        const parsedNotification: Notification = {
          ...notification,
          createdAt: new Date(notification.createdAt),
        };

        // Add to beginning of list
        notifications.value.unshift(parsedNotification);
        unreadCount.value++;

        // Show toast notification
        toast.info(parsedNotification.title, {
          description: parsedNotification.message || undefined,
        });
      } catch (err) {
        logger.error('[Notifications] Failed to parse SSE message:', err);
      }
    });

    eventSource.onerror = () => {
      logger.warn('[Notifications] SSE connection error, will reconnect...');
      isConnected.value = false;
      disconnectSSE();

      // Reconnect after 5 seconds
      setTimeout(() => {
        if (!eventSource) {
          connectSSE();
        }
      }, 5000);
    };
  }

  function disconnectSSE(): void {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
      isConnected.value = false;
      logger.debug('[Notifications] SSE disconnected');
    }
  }

  function getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case 'lesson_completed':
        return 'check-circle';
      case 'course_completed':
        return 'award';
      case 'quiz_passed':
        return 'check-square';
      case 'badge_earned':
        return 'award';
      case 'discussion_reply':
        return 'message-circle';
      case 'purchase_confirmed':
        return 'shopping-cart';
      default:
        return 'bell';
    }
  }

  function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnectSSE();
  });

  return {
    // State
    notifications,
    unreadCount,
    isLoading,
    error,
    pagination,
    isConnected,

    // Computed
    recentNotifications,
    hasUnread,

    // Methods
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    connectSSE,
    disconnectSSE,
    getNotificationIcon,
    formatTimeAgo,
  };
}

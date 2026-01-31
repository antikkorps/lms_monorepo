import type { Context } from 'koa';
import { UserRole } from '../database/models/enums.js';
import { notificationService, preferenceService } from '../services/notifications/index.js';
import { AppError } from '../utils/app-error.js';
import type { ListNotificationsQuery, UpdatePreferencesInput } from './schemas.js';

interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  tenantId?: string | null;
}

function getAuthenticatedUser(ctx: Context): AuthenticatedUser {
  const user = ctx.state.user as AuthenticatedUser | undefined;
  if (!user) {
    throw AppError.unauthorized('Authentication required');
  }
  return user;
}

export async function listNotifications(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const query = ctx.query as unknown as ListNotificationsQuery;

  const result = await notificationService.getUserNotifications(user.userId, {
    page: query.page,
    limit: query.limit,
    unreadOnly: query.unreadOnly,
  });

  ctx.body = {
    success: true,
    data: {
      notifications: result.notifications,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    },
  };
}

export async function getUnreadCount(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);

  const count = await notificationService.getUnreadCount(user.userId);

  ctx.body = {
    data: { unreadCount: count },
  };
}

export async function markAsRead(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { id } = ctx.params;

  const notification = await notificationService.markAsRead(id, user.userId);

  if (!notification) {
    throw AppError.notFound('Notification not found');
  }

  ctx.body = {
    data: {
      id: notification.id,
      read: notification.read,
      readAt: notification.readAt,
    },
  };
}

export async function markAllAsRead(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);

  const count = await notificationService.markAllAsRead(user.userId);

  ctx.body = {
    data: { markedCount: count },
  };
}

export async function deleteNotification(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { id } = ctx.params;

  const deleted = await notificationService.delete(id, user.userId);

  if (!deleted) {
    throw AppError.notFound('Notification not found');
  }

  ctx.status = 204;
}

export async function getPreferences(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);

  const preferences = await preferenceService.getOrCreate(user.userId);

  ctx.body = {
    data: {
      emailEnabled: preferences.emailEnabled,
      inAppEnabled: preferences.inAppEnabled,
      digestFrequency: preferences.digestFrequency,
      digestDay: preferences.digestDay,
    },
  };
}

export async function updatePreferences(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const input = ctx.request.body as UpdatePreferencesInput;

  const preferences = await preferenceService.update(user.userId, input);

  ctx.body = {
    data: {
      emailEnabled: preferences.emailEnabled,
      inAppEnabled: preferences.inAppEnabled,
      digestFrequency: preferences.digestFrequency,
      digestDay: preferences.digestDay,
    },
  };
}

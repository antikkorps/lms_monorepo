import Router from '@koa/router';
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
} from './controller.js';
import { handleSSE } from './sse.controller.js';
import { authenticate } from '../auth/middleware.js';
import { validate, validateQuery } from '../middlewares/validate.js';
import { listNotificationsQuerySchema, updatePreferencesSchema } from './schemas.js';

export const notificationsRouter = new Router({ prefix: '/notifications' });

// List notifications
notificationsRouter.get(
  '/',
  authenticate,
  validateQuery(listNotificationsQuerySchema),
  listNotifications
);

// Get unread count
notificationsRouter.get(
  '/unread-count',
  authenticate,
  getUnreadCount
);

// SSE stream for real-time notifications
notificationsRouter.get(
  '/stream',
  authenticate,
  handleSSE
);

// Get preferences
notificationsRouter.get(
  '/preferences',
  authenticate,
  getPreferences
);

// Update preferences
notificationsRouter.patch(
  '/preferences',
  authenticate,
  validate(updatePreferencesSchema),
  updatePreferences
);

// Mark single notification as read
notificationsRouter.patch(
  '/:id/read',
  authenticate,
  markAsRead
);

// Mark all notifications as read
notificationsRouter.post(
  '/mark-all-read',
  authenticate,
  markAllAsRead
);

// Delete notification
notificationsRouter.delete(
  '/:id',
  authenticate,
  deleteNotification
);

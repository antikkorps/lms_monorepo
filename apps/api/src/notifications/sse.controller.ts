import type { Context } from 'koa';
import { PassThrough } from 'stream';
import { UserRole } from '../database/models/enums.js';
import { subscribeToUserNotifications, type NotificationPayload } from '../services/notifications/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';

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

export async function handleSSE(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const userId = user.userId;

  // Set SSE headers
  ctx.set('Content-Type', 'text/event-stream');
  ctx.set('Cache-Control', 'no-cache');
  ctx.set('Connection', 'keep-alive');
  ctx.set('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Create a stream for the response
  const stream = new PassThrough();
  ctx.body = stream;
  ctx.status = 200;

  // Send initial connection message
  stream.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

  // Subscribe to user's notifications channel
  const { unsubscribe } = await subscribeToUserNotifications(
    userId,
    (notification: NotificationPayload) => {
      try {
        const eventData = JSON.stringify(notification);
        stream.write(`event: notification\ndata: ${eventData}\n\n`);
      } catch (error) {
        logger.error(
          { userId, error: error instanceof Error ? error.message : 'Unknown' },
          'Error sending SSE notification'
        );
      }
    }
  );

  // Send periodic keep-alive pings
  const pingInterval = setInterval(() => {
    try {
      stream.write(`: ping\n\n`);
    } catch {
      // Stream might be closed
    }
  }, 30000);

  logger.info({ userId }, 'SSE connection established');

  // Track if already cleaning up to prevent double cleanup
  let isCleaningUp = false;

  // Handle client disconnect
  const cleanup = async () => {
    if (isCleaningUp) return;
    isCleaningUp = true;

    clearInterval(pingInterval);

    try {
      await unsubscribe();
    } catch (error) {
      // Ignore unsubscribe errors - connection might already be closed
      logger.debug({ userId, error: error instanceof Error ? error.message : 'Unknown' }, 'Unsubscribe error (ignorable)');
    }

    try {
      if (!stream.destroyed) {
        stream.end();
      }
    } catch {
      // Ignore stream close errors
    }

    logger.info({ userId }, 'SSE connection closed');
  };

  ctx.req.on('close', cleanup);
  ctx.req.on('error', cleanup);

  // Handle stream errors
  stream.on('error', (error) => {
    logger.debug({ userId, error: error.message }, 'SSE stream error (ignorable)');
    cleanup();
  });
}

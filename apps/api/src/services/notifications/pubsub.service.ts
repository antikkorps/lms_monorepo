import Redis from 'ioredis';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { NOTIFICATION_CHANNEL_PREFIX, type NotificationPayload } from './notification.types.js';

let publisher: Redis | null = null;

export function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    publisher.on('error', (err) => {
      logger.error({ error: err.message }, 'Notification pubsub publisher error');
    });
  }
  return publisher;
}

export async function publishNotification(
  userId: string,
  notification: NotificationPayload
): Promise<void> {
  const channel = `${NOTIFICATION_CHANNEL_PREFIX}${userId}`;
  const message = JSON.stringify(notification);

  try {
    await getPublisher().publish(channel, message);
    logger.debug({ userId, notificationId: notification.id }, 'Notification published');
  } catch (error) {
    logger.error(
      { userId, error: error instanceof Error ? error.message : 'Unknown' },
      'Failed to publish notification'
    );
  }
}

export function createSubscriber(): Redis {
  const subscriber = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  subscriber.on('error', (err) => {
    logger.error({ error: err.message }, 'Notification pubsub subscriber error');
  });

  return subscriber;
}

export async function subscribeToUserNotifications(
  userId: string,
  onMessage: (notification: NotificationPayload) => void
): Promise<{ subscriber: Redis; unsubscribe: () => Promise<void> }> {
  const subscriber = createSubscriber();
  const channel = `${NOTIFICATION_CHANNEL_PREFIX}${userId}`;

  await subscriber.connect();
  await subscriber.subscribe(channel);

  subscriber.on('message', (_receivedChannel: string, message: string) => {
    try {
      const notification = JSON.parse(message) as NotificationPayload;
      onMessage(notification);
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : 'Unknown' },
        'Failed to parse notification message'
      );
    }
  });

  logger.debug({ userId, channel }, 'Subscribed to user notifications');

  const unsubscribe = async (): Promise<void> => {
    try {
      await subscriber.unsubscribe(channel);
    } catch {
      // Ignore - connection might already be closed
    }
    try {
      await subscriber.quit();
    } catch {
      // Ignore - connection might already be closed
    }
    logger.debug({ userId }, 'Unsubscribed from user notifications');
  };

  return { subscriber, unsubscribe };
}

export async function disconnectPublisher(): Promise<void> {
  if (publisher) {
    await publisher.quit();
    publisher = null;
    logger.info('Notification publisher disconnected');
  }
}

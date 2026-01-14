import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from './logger.js';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 3) {
          logger.error('Redis: Max retry attempts reached');
          return null;
        }
        const delay = Math.min(times * 200, 2000);
        logger.warn(`Redis: Retrying connection in ${delay}ms (attempt ${times})`);
        return delay;
      },
      lazyConnect: true,
    });

    redis.on('connect', () => {
      logger.info('Redis: Connected successfully');
    });

    redis.on('error', (err) => {
      logger.error({ error: err.message }, 'Redis: Connection error');
    });

    redis.on('close', () => {
      logger.info('Redis: Connection closed');
    });
  }

  return redis;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  await client.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis: Disconnected gracefully');
  }
}

export { redis };

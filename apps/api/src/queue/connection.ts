import { config } from '../config/index.js';

export const queueConnection = {
  host: new URL(config.redisUrl).hostname || 'localhost',
  port: Number.parseInt(new URL(config.redisUrl).port || '6379', 10),
  password: new URL(config.redisUrl).password || undefined,
};

import Router from '@koa/router';
import { sequelize } from '../database/sequelize.js';
import { getRedisClient } from '../utils/redis.js';
import { logger } from '../utils/logger.js';

export const healthRouter = new Router({ prefix: '/health' });

healthRouter.get('/', async (ctx) => {
  ctx.body = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  };
});

healthRouter.get('/ready', async (ctx) => {
  const checks: Record<string, boolean> = {
    database: false,
    redis: false,
  };

  // Database check
  try {
    await sequelize.authenticate();
    checks.database = true;
  } catch (err) {
    logger.error({ err }, 'Health check: database unreachable');
  }

  // Redis check
  try {
    const redis = getRedisClient();
    const pong = await redis.ping();
    checks.redis = pong === 'PONG';
  } catch (err) {
    logger.error({ err }, 'Health check: Redis unreachable');
  }

  const isReady = Object.values(checks).every(Boolean);

  ctx.status = isReady ? 200 : 503;
  ctx.body = {
    success: isReady,
    data: {
      status: isReady ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  };
});

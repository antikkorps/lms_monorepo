import Router from '@koa/router';
import type { Context } from 'koa';
import { sequelize } from '../database/sequelize.js';
import { getRedisClient } from '../utils/redis.js';
import { logger } from '../utils/logger.js';
import { isShuttingDown } from '../utils/shutdown.js';

export const healthRouter = new Router({ prefix: '/health' });

/**
 * Liveness probe — is the process up at all? Cheap, no dependency checks.
 */
export async function healthCheck(ctx: Context): Promise<void> {
  ctx.body = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  };
}

/**
 * Readiness probe — should this instance receive traffic?
 *
 * Returns 503 as soon as graceful shutdown begins so the load balancer drains
 * this instance before connections are cut. Otherwise verifies DB + Redis.
 */
export async function readinessCheck(ctx: Context): Promise<void> {
  if (isShuttingDown()) {
    ctx.status = 503;
    ctx.body = {
      success: false,
      data: {
        status: 'shutting_down',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    };
    return;
  }

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
}

healthRouter.get('/', healthCheck);
healthRouter.get('/ready', readinessCheck);

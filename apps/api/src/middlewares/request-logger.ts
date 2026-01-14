import type { Context, Next } from 'koa';
import { logger } from '../utils/logger.js';

export async function requestLogger(ctx: Context, next: Next): Promise<void> {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  ctx.state.requestId = requestId;

  await next();

  const duration = Date.now() - start;

  logger.info({
    requestId,
    method: ctx.method,
    path: ctx.path,
    status: ctx.status,
    duration: `${duration}ms`,
    userId: ctx.state.user?.userId,
    tenantId: ctx.state.tenant?.id,
    userAgent: ctx.request.header['user-agent'],
    ip: ctx.ip,
  });
}

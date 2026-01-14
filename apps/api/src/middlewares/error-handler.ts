import type { Context, Next } from 'koa';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';

export async function errorHandler(ctx: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (err) {
    if (err instanceof AppError) {
      ctx.status = err.statusCode;
      ctx.body = {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details && { details: err.details }),
        },
      };

      if (err.statusCode >= 500) {
        logger.error({
          err,
          userId: ctx.state.user?.userId,
          tenantId: ctx.state.tenant?.id,
          path: ctx.path,
          method: ctx.method,
        });
      }
    } else {
      // Unknown error
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      };

      logger.error({
        err,
        userId: ctx.state.user?.userId,
        tenantId: ctx.state.tenant?.id,
        path: ctx.path,
        method: ctx.method,
      });
    }
  }
}

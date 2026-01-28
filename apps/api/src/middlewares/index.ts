import type Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import helmet from 'koa-helmet';
import serve from 'koa-static';
import mount from 'koa-mount';
import { config } from '../config/index.js';
import { errorHandler } from './error-handler.js';
import { requestLogger } from './request-logger.js';
import { defaultRateLimiter } from './rate-limiter.js';

export function setupMiddlewares(app: Koa): void {
  // Error handling (should be first to catch all errors)
  app.use(errorHandler);

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: (ctx) => {
        const origin = ctx.request.header.origin;
        if (origin && config.corsOrigins.includes(origin)) {
          return origin;
        }
        return config.corsOrigins[0];
      },
      credentials: true,
      exposeHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-RateLimit-Tier',
        'Retry-After',
      ],
    })
  );

  // Rate limiting (before body parsing to save resources on blocked requests)
  app.use(defaultRateLimiter);

  // Body parser
  app.use(bodyParser());

  // Request logging
  app.use(requestLogger);

  // Serve uploaded files in development (local storage)
  if (config.storage?.provider === 'local') {
    const uploadPath = config.storage.localPath || './uploads';
    app.use(mount('/uploads', serve(uploadPath)));
  }
}

export { authRateLimiter } from './rate-limiter.js';

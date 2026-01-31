import type Koa from 'koa';
import type { Middleware } from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import helmet from 'koa-helmet';
import serve from 'koa-static';
import mount from 'koa-mount';
import { config } from '../config/index.js';
import { errorHandler } from './error-handler.js';
import { requestLogger } from './request-logger.js';
import { defaultRateLimiter } from './rate-limiter.js';

// Paths that need raw body preserved (for webhook signature verification)
const RAW_BODY_PATHS = ['/api/v1/webhooks/stripe'];

// Extend Koa Request type to include rawBodyBuffer
// Note: koa-bodyparser already declares rawBody as string, so we use a different name
declare module 'koa' {
  interface Request {
    rawBodyBuffer?: Buffer;
  }
}

// Middleware to capture raw body for specific paths
function rawBodyMiddleware(): Middleware {
  return async (ctx, next) => {
    if (RAW_BODY_PATHS.some((path) => ctx.path.startsWith(path))) {
      // Collect raw body chunks
      const chunks: Buffer[] = [];
      ctx.req.on('data', (chunk: Buffer) => chunks.push(chunk));
      await new Promise<void>((resolve) => ctx.req.on('end', resolve));

      // Store raw body buffer for webhook signature verification
      const rawBody = Buffer.concat(chunks);
      ctx.request.rawBodyBuffer = rawBody;

      // Parse JSON manually for webhook routes
      if (rawBody.length > 0) {
        try {
          ctx.request.body = JSON.parse(rawBody.toString('utf8'));
        } catch {
          ctx.request.body = {};
        }
      }
    }
    await next();
  };
}

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

  // Raw body capture for webhook routes (must be before bodyParser)
  app.use(rawBodyMiddleware());

  // Body parser (skipped for webhook routes that already have body parsed)
  app.use(
    bodyParser({
      onerror: (err, ctx) => {
        // If raw body was already captured, don't throw
        if (ctx.request.rawBodyBuffer) return;
        throw err;
      },
    })
  );

  // Request logging
  app.use(requestLogger);

  // Serve uploaded files in development (local storage)
  if (config.storage?.provider === 'local') {
    const uploadPath = config.storage.localPath || './uploads';
    app.use(mount('/uploads', serve(uploadPath)));
  }
}

export { authRateLimiter } from './rate-limiter.js';

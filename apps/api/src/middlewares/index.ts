import type Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import helmet from 'koa-helmet';
import { config } from '../config/index.js';
import { errorHandler } from './error-handler.js';
import { requestLogger } from './request-logger.js';

export function setupMiddlewares(app: Koa): void {
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
    })
  );

  // Body parser
  app.use(bodyParser());

  // Request logging
  app.use(requestLogger);

  // Error handling (should be first to catch all errors)
  app.use(errorHandler);
}

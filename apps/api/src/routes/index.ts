import type Koa from 'koa';
import Router from '@koa/router';
import { healthRouter } from './health.js';

const apiRouter = new Router({ prefix: '/api/v1' });

// Mount route modules
apiRouter.use(healthRouter.routes());

export function setupRoutes(app: Koa): void {
  app.use(apiRouter.routes());
  app.use(apiRouter.allowedMethods());
}

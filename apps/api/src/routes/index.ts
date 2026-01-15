import type Koa from 'koa';
import Router from '@koa/router';
import { healthRouter } from './health.js';
import { authRouter } from '../auth/index.js';
import { invitationRouter } from '../invitations/index.js';

const apiRouter = new Router({ prefix: '/api/v1' });

// Mount route modules
apiRouter.use(healthRouter.routes());
apiRouter.use(authRouter.routes());
apiRouter.use(authRouter.allowedMethods());
apiRouter.use(invitationRouter.routes());
apiRouter.use(invitationRouter.allowedMethods());

export function setupRoutes(app: Koa): void {
  app.use(apiRouter.routes());
  app.use(apiRouter.allowedMethods());
}

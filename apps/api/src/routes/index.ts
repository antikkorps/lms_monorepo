import type Koa from 'koa';
import Router from '@koa/router';
import { healthRouter } from './health.js';
import { authRouter } from '../auth/index.js';
import { ssoRouter } from '../sso/index.js';
import { invitationRouter } from '../invitations/index.js';
import { coursesRouter, lessonsRouter } from '../courses/index.js';
import { discussionsRouter } from '../discussions/index.js';
import { notesRouter } from '../notes/index.js';
import { lessonContentRouter } from '../lesson-content/index.js';
import { quizRouter } from '../quiz/index.js';
import { dashboardRouter } from '../dashboard/index.js';
import { analyticsRouter } from '../analytics/index.js';
import { badgesRouter } from '../badges/index.js';
import { tenantRouter } from '../tenant/index.js';
import { uploadsRouter } from '../uploads/index.js';
import { certificateRoutes } from '../certificates/index.js';

const apiRouter = new Router({ prefix: '/api/v1' });

// Mount route modules
apiRouter.use(healthRouter.routes());
apiRouter.use(authRouter.routes());
apiRouter.use(authRouter.allowedMethods());
apiRouter.use(ssoRouter.routes());
apiRouter.use(ssoRouter.allowedMethods());
apiRouter.use(invitationRouter.routes());
apiRouter.use(invitationRouter.allowedMethods());
apiRouter.use(coursesRouter.routes());
apiRouter.use(coursesRouter.allowedMethods());
apiRouter.use(lessonsRouter.routes());
apiRouter.use(lessonsRouter.allowedMethods());
apiRouter.use(discussionsRouter.routes());
apiRouter.use(discussionsRouter.allowedMethods());
apiRouter.use(notesRouter.routes());
apiRouter.use(notesRouter.allowedMethods());
apiRouter.use(lessonContentRouter.routes());
apiRouter.use(lessonContentRouter.allowedMethods());
apiRouter.use(quizRouter.routes());
apiRouter.use(quizRouter.allowedMethods());
apiRouter.use(dashboardRouter.routes());
apiRouter.use(dashboardRouter.allowedMethods());
apiRouter.use(analyticsRouter.routes());
apiRouter.use(analyticsRouter.allowedMethods());
apiRouter.use(badgesRouter.routes());
apiRouter.use(badgesRouter.allowedMethods());
apiRouter.use(tenantRouter.routes());
apiRouter.use(tenantRouter.allowedMethods());
apiRouter.use(uploadsRouter.routes());
apiRouter.use(uploadsRouter.allowedMethods());
apiRouter.use(certificateRoutes.routes());
apiRouter.use(certificateRoutes.allowedMethods());

export function setupRoutes(app: Koa): void {
  app.use(apiRouter.routes());
  app.use(apiRouter.allowedMethods());
}

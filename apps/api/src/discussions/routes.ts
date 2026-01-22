import Router from '@koa/router';
import {
  listDiscussions,
  createDiscussion,
  deleteDiscussion,
  reportDiscussion,
  listReplies,
  createReply,
  deleteReply,
  reportReply,
} from './controller.js';
import { authenticate } from '../auth/middleware.js';
import { validate, validateQuery } from '../middlewares/validate.js';
import {
  createDiscussionSchema,
  listDiscussionsQuerySchema,
  createReplySchema,
  reportSchema,
} from './schemas.js';

export const discussionsRouter = new Router({ prefix: '/discussions' });

// =============================================================================
// Discussion routes
// =============================================================================

discussionsRouter.get(
  '/',
  authenticate,
  validateQuery(listDiscussionsQuerySchema),
  listDiscussions
);

discussionsRouter.post(
  '/',
  authenticate,
  validate(createDiscussionSchema),
  createDiscussion
);

discussionsRouter.delete(
  '/:id',
  authenticate,
  deleteDiscussion
);

discussionsRouter.post(
  '/:id/report',
  authenticate,
  validate(reportSchema),
  reportDiscussion
);

// =============================================================================
// Reply routes
// =============================================================================

discussionsRouter.get(
  '/:id/replies',
  authenticate,
  listReplies
);

discussionsRouter.post(
  '/:id/replies',
  authenticate,
  validate(createReplySchema),
  createReply
);

discussionsRouter.delete(
  '/:id/replies/:replyId',
  authenticate,
  deleteReply
);

discussionsRouter.post(
  '/:id/replies/:replyId/report',
  authenticate,
  validate(reportSchema),
  reportReply
);

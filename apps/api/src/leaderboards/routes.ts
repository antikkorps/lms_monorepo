import Router from '@koa/router';
import { getLeaderboard, getMyRank } from './controller.js';
import { authenticate } from '../auth/middleware.js';
import { validateQuery } from '../middlewares/validate.js';
import { leaderboardQuerySchema } from './schemas.js';

export const leaderboardsRouter = new Router({ prefix: '/leaderboards' });

leaderboardsRouter.get(
  '/',
  authenticate,
  validateQuery(leaderboardQuerySchema),
  getLeaderboard
);

leaderboardsRouter.get(
  '/me',
  authenticate,
  validateQuery(leaderboardQuerySchema),
  getMyRank
);

import Router from '@koa/router';
import { getMyStreak } from './controller.js';
import { authenticate } from '../auth/middleware.js';

export const streaksRouter = new Router({ prefix: '/streaks' });

streaksRouter.get('/me', authenticate, getMyStreak);

import Router from '@koa/router';
import { authenticate } from '../auth/middleware.js';
import { getUserBadges } from './controller.js';

export const badgesRouter = new Router();

// User badges (requires authentication)
badgesRouter.get('/user/badges', authenticate, getUserBadges);

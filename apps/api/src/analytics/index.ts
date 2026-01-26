import Router from '@koa/router';
import { authenticate } from '../auth/middleware.js';
import { getLearnerAnalytics } from './controller.js';

export const analyticsRouter = new Router();

// Learner analytics (requires authentication)
analyticsRouter.get('/learner/analytics', authenticate, getLearnerAnalytics);

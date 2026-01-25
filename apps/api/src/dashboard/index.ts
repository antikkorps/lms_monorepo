import Router from '@koa/router';
import { authenticate } from '../auth/middleware.js';
import { getLearnerDashboard, getLearnerProgress } from './controller.js';

export const dashboardRouter = new Router();

// Learner dashboard (requires authentication)
dashboardRouter.get('/learner/dashboard', authenticate, getLearnerDashboard);

// Learner progress - all enrolled courses with full progress data
dashboardRouter.get('/learner/progress', authenticate, getLearnerProgress);

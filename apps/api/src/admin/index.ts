import Router from '@koa/router';
import { authenticate, requireSuperAdmin } from '../auth/middleware.js';
import { sendTestEmail, getEmailStats, getEmailLogs } from './email.controller.js';

export const adminRouter = new Router({ prefix: '/admin' });

// All admin routes require authentication and SuperAdmin role
const superAdminAuth = [authenticate, requireSuperAdmin];

// Email endpoints
adminRouter.post('/email/test', ...superAdminAuth, sendTestEmail);
adminRouter.get('/email/stats', ...superAdminAuth, getEmailStats);
adminRouter.get('/email/logs', ...superAdminAuth, getEmailLogs);

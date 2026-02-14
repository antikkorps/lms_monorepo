import Router from '@koa/router';
import { authenticate, requireSuperAdmin, requireRole } from '../auth/middleware.js';
import { UserRole } from '../database/models/enums.js';
import { sendTestEmail, getEmailStats, getEmailLogs } from './email.controller.js';
import { getTranscodingStats, listTranscodingJobs, retryTranscodingJob } from './transcoding.controller.js';
import {
  getAnalyticsOverview,
  getAnalyticsRevenue,
  getAnalyticsEngagement,
  getAnalyticsExport,
  getAnalyticsLicenses,
} from './analytics.controller.js';
import { getCourseAnalytics } from './analytics-course.controller.js';
import { updateTenantDiscountTiers, deleteTenantDiscountTiers } from '../tenant/licenses.controller.js';

export const adminRouter = new Router({ prefix: '/admin' });

// All admin routes require authentication and SuperAdmin role
const superAdminAuth = [authenticate, requireSuperAdmin];

// Analytics routes require admin role (super_admin or tenant_admin)
const adminAuth = [authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)];

// Email endpoints
adminRouter.post('/email/test', ...superAdminAuth, sendTestEmail);
adminRouter.get('/email/stats', ...superAdminAuth, getEmailStats);
adminRouter.get('/email/logs', ...superAdminAuth, getEmailLogs);

// Transcoding endpoints
adminRouter.get('/transcoding/stats', ...superAdminAuth, getTranscodingStats);
adminRouter.get('/transcoding/jobs', ...superAdminAuth, listTranscodingJobs);
adminRouter.post('/transcoding/jobs/:id/retry', ...superAdminAuth, retryTranscodingJob);

// Analytics endpoints
adminRouter.get('/analytics/overview', ...adminAuth, getAnalyticsOverview);
adminRouter.get('/analytics/revenue', ...adminAuth, getAnalyticsRevenue);
adminRouter.get('/analytics/engagement', ...adminAuth, getAnalyticsEngagement);
adminRouter.get('/analytics/export', ...adminAuth, getAnalyticsExport);
adminRouter.get('/analytics/licenses', ...adminAuth, getAnalyticsLicenses);
adminRouter.get('/analytics/courses/:courseId', ...adminAuth, getCourseAnalytics);

// Tenant discount tier overrides (super admin only)
adminRouter.put('/tenants/:id/discount-tiers', ...superAdminAuth, updateTenantDiscountTiers);
adminRouter.delete('/tenants/:id/discount-tiers', ...superAdminAuth, deleteTenantDiscountTiers);

import Router from '@koa/router';
import { authenticate, requireTenant, requireRole } from '../auth/middleware.js';
import { UserRole } from '../database/models/enums.js';
import {
  getTenantDashboard,
  getTenantMembers,
  updateMemberRole,
  suspendMember,
  reactivateMember,
  removeMember,
  getSeatOverview,
  getSeatAllocations,
  getSeatUsageHistory,
  getSeatPlans,
  requestSeats,
  upgradePlan,
} from './controller.js';
import {
  createSubscriptionCheckout,
  createPortalSession,
  getSubscriptionStatus,
  updateSeats,
  cancelSubscription,
  reactivateSubscription,
} from './billing.controller.js';
import {
  createLicenseCheckout,
  listLicenses,
  getLicense,
  getLicensePricing,
  assignSeat,
  unassignSeat,
  requestLicenseRefund,
  renewLicense,
} from './licenses.controller.js';
import {
  listInvoices,
  getInvoice,
  getInvoicePdf,
} from './invoices.controller.js';
import {
  getTenantSSO,
  updateTenantSSO,
  deleteTenantSSO,
  testTenantSSO,
} from './sso.controller.js';

export const tenantRouter = new Router({ prefix: '/tenant' });

// All tenant routes require authentication and tenant membership
const tenantAdminAuth = [authenticate, requireTenant, requireRole(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)];

// Dashboard
tenantRouter.get('/dashboard', ...tenantAdminAuth, getTenantDashboard);

// Members management
tenantRouter.get('/members', ...tenantAdminAuth, getTenantMembers);
tenantRouter.patch('/members/:id/role', ...tenantAdminAuth, updateMemberRole);
tenantRouter.patch('/members/:id/suspend', ...tenantAdminAuth, suspendMember);
tenantRouter.patch('/members/:id/reactivate', ...tenantAdminAuth, reactivateMember);
tenantRouter.delete('/members/:id', ...tenantAdminAuth, removeMember);

// Seats management
tenantRouter.get('/seats', ...tenantAdminAuth, getSeatOverview);
tenantRouter.get('/seats/allocations', ...tenantAdminAuth, getSeatAllocations);
tenantRouter.get('/seats/history', ...tenantAdminAuth, getSeatUsageHistory);
tenantRouter.get('/seats/plans', ...tenantAdminAuth, getSeatPlans);
tenantRouter.post('/seats/request', ...tenantAdminAuth, requestSeats);
tenantRouter.post('/seats/upgrade', ...tenantAdminAuth, upgradePlan);

// Billing (Stripe subscription management)
tenantRouter.post('/billing/checkout', ...tenantAdminAuth, createSubscriptionCheckout);
tenantRouter.post('/billing/portal', ...tenantAdminAuth, createPortalSession);
tenantRouter.get('/billing/subscription', ...tenantAdminAuth, getSubscriptionStatus);
tenantRouter.patch('/billing/seats', ...tenantAdminAuth, updateSeats);
tenantRouter.post('/billing/cancel', ...tenantAdminAuth, cancelSubscription);
tenantRouter.post('/billing/reactivate', ...tenantAdminAuth, reactivateSubscription);

// Course licenses (B2B course access)
const licenseAdminAuth = [authenticate, requireTenant, requireRole(UserRole.TENANT_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)];
tenantRouter.post('/licenses/checkout', ...licenseAdminAuth, createLicenseCheckout);
tenantRouter.get('/licenses/pricing', ...licenseAdminAuth, getLicensePricing);
tenantRouter.get('/licenses', ...licenseAdminAuth, listLicenses);
tenantRouter.get('/licenses/:id', ...licenseAdminAuth, getLicense);
tenantRouter.post('/licenses/:id/assign', ...licenseAdminAuth, assignSeat);
tenantRouter.post('/licenses/:id/renew', ...licenseAdminAuth, renewLicense);
tenantRouter.delete('/licenses/:id/assignments/:userId', ...licenseAdminAuth, unassignSeat);
tenantRouter.post('/licenses/:id/refund', ...tenantAdminAuth, requestLicenseRefund);

// Invoices (Stripe invoices for tenant billing)
const invoiceAuth = [authenticate, requireTenant];
tenantRouter.get('/invoices', ...invoiceAuth, listInvoices);
tenantRouter.get('/invoices/:id', ...invoiceAuth, getInvoice);
tenantRouter.get('/invoices/:id/pdf', ...invoiceAuth, getInvoicePdf);

// SSO Configuration (tenant admin only)
tenantRouter.get('/sso', ...tenantAdminAuth, getTenantSSO);
tenantRouter.put('/sso', ...tenantAdminAuth, updateTenantSSO);
tenantRouter.delete('/sso', ...tenantAdminAuth, deleteTenantSSO);
tenantRouter.post('/sso/test', ...tenantAdminAuth, testTenantSSO);

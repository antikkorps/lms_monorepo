import Router from '@koa/router';
import {
  createCourseCheckout,
  verifyPurchase,
  listPurchases,
  getPurchase,
  processRefund,
} from './controller.js';
import { handleStripeWebhook } from './webhook.controller.js';
import { authenticate, requireRole } from '../auth/middleware.js';
import { validate } from '../middlewares/validate.js';
import { createCourseCheckoutSchema, verifyPurchaseSchema, processRefundSchema } from './schemas.js';
import { UserRole } from '../database/models/enums.js';

export const paymentsRouter = new Router({ prefix: '/payments' });
export const webhooksRouter = new Router({ prefix: '/webhooks' });

// =============================================================================
// Payment routes (authenticated)
// =============================================================================

// Create checkout session for course purchase
paymentsRouter.post(
  '/checkout/course',
  authenticate,
  validate(createCourseCheckoutSchema),
  createCourseCheckout
);

// Verify purchase status after checkout
paymentsRouter.post(
  '/verify',
  authenticate,
  validate(verifyPurchaseSchema),
  verifyPurchase
);

// List user's purchases
paymentsRouter.get('/purchases', authenticate, listPurchases);

// Get single purchase
paymentsRouter.get('/purchases/:id', authenticate, getPurchase);

// Process refund (admin only)
paymentsRouter.post(
  '/:purchaseId/refund',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN),
  validate(processRefundSchema),
  processRefund
);

// =============================================================================
// Webhook routes (no authentication - uses Stripe signature)
// =============================================================================

webhooksRouter.post('/stripe', handleStripeWebhook);

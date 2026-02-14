import Router from '@koa/router';
import {
  createCourseCheckout,
  verifyPurchase,
  listPurchases,
  getPurchase,
  processRefund,
  requestRefund,
  listRefundRequests,
  reviewRefundRequest,
} from './controller.js';
import { handleStripeWebhook } from './webhook.controller.js';
import { handleTranscodingWebhook } from '../services/transcoding/webhook.controller.js';
import { authenticate, requireRole } from '../auth/middleware.js';
import { validate } from '../middlewares/validate.js';
import {
  createCourseCheckoutSchema,
  verifyPurchaseSchema,
  processRefundSchema,
  requestRefundSchema,
  reviewRefundRequestSchema,
} from './schemas.js';
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

// Process refund (admin only - direct refund without request)
paymentsRouter.post(
  '/:purchaseId/refund',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN),
  validate(processRefundSchema),
  processRefund
);

// =============================================================================
// Refund Request routes
// =============================================================================

// Request a refund (learners)
// < 1 hour: auto-refund, > 1 hour: pending admin approval
paymentsRouter.post(
  '/:purchaseId/request-refund',
  authenticate,
  validate(requestRefundSchema),
  requestRefund
);

// List refund requests (super admin only - B2C purchases)
paymentsRouter.get(
  '/refund-requests',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN),
  listRefundRequests
);

// Review refund request (super admin only - B2C purchases)
paymentsRouter.post(
  '/:purchaseId/review-refund',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN),
  validate(reviewRefundRequestSchema),
  reviewRefundRequest
);

// =============================================================================
// Webhook routes (no authentication - uses Stripe signature)
// =============================================================================

webhooksRouter.post('/stripe', handleStripeWebhook);
webhooksRouter.post('/transcoding', handleTranscodingWebhook);

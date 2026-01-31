import type { Context } from 'koa';
import { Course, Purchase, User } from '../database/models/index.js';
import { CourseStatus, PurchaseStatus, UserRole } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { stripeService } from '../services/stripe/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { CreateCourseCheckoutBody, VerifyPurchaseBody, ProcessRefundBody } from './schemas.js';

interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  tenantId?: string | null;
}

function getAuthenticatedUser(ctx: Context): AuthenticatedUser {
  const user = ctx.state.user as AuthenticatedUser | undefined;
  if (!user) {
    throw AppError.unauthorized('Authentication required');
  }
  return user;
}

/**
 * Create a Stripe Checkout session for purchasing a course
 * POST /payments/checkout/course
 */
export async function createCourseCheckout(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { courseId } = ctx.request.body as CreateCourseCheckoutBody;

  // Get course
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  // Verify course is published
  if (course.status !== CourseStatus.PUBLISHED) {
    throw AppError.badRequest('Course is not available for purchase');
  }

  // Verify course is not free
  if (course.isFree) {
    throw AppError.badRequest('This course is free. Use the enrollment endpoint instead.');
  }

  // Check if user already purchased this course
  const existingPurchase = await Purchase.findOne({
    where: {
      userId: user.userId,
      courseId,
      status: PurchaseStatus.COMPLETED,
    },
  });

  if (existingPurchase) {
    throw new AppError('You have already purchased this course', 409, 'ALREADY_PURCHASED');
  }

  // Check for pending purchase
  const pendingPurchase = await Purchase.findOne({
    where: {
      userId: user.userId,
      courseId,
      status: PurchaseStatus.PENDING,
    },
  });

  // Get user email
  const dbUser = await User.findByPk(user.userId);
  if (!dbUser) {
    throw AppError.notFound('User not found');
  }

  // Convert price to cents
  const priceInCents = Math.round(Number(course.price) * 100);

  // Create Stripe checkout session
  const { sessionId, url } = await stripeService.createCourseCheckoutSession({
    courseId,
    userId: user.userId,
    courseName: course.title,
    courseDescription: course.description || undefined,
    priceInCents,
    currency: course.currency,
    stripePriceId: course.stripePriceId || undefined,
    customerEmail: dbUser.email,
    successUrl: `${config.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${config.frontendUrl}/payment/cancel?course=${course.slug}`,
  });

  // Create or update pending purchase
  if (pendingPurchase) {
    await pendingPurchase.update({
      stripeCheckoutSessionId: sessionId,
      amount: course.price,
      currency: course.currency,
    });
  } else {
    await Purchase.create({
      userId: user.userId,
      courseId,
      tenantId: user.tenantId || null,
      amount: Number(course.price),
      currency: course.currency,
      status: PurchaseStatus.PENDING,
      stripeCheckoutSessionId: sessionId,
    });
  }

  logger.info(
    { userId: user.userId, courseId, sessionId },
    'Checkout session created'
  );

  ctx.body = {
    data: {
      sessionId,
      url,
    },
  };
}

/**
 * Verify a purchase after Stripe checkout completion
 * POST /payments/verify
 */
export async function verifyPurchase(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { sessionId } = ctx.request.body as VerifyPurchaseBody;

  // Retrieve checkout session from Stripe
  const session = await stripeService.retrieveCheckoutSession(sessionId);

  // Validate session belongs to this user
  if (session.metadata?.userId !== user.userId) {
    throw AppError.forbidden('This session does not belong to you');
  }

  // Find purchase by session ID
  const purchase = await Purchase.findOne({
    where: { stripeCheckoutSessionId: sessionId },
    include: [{ model: Course, as: 'course' }],
  });

  if (!purchase) {
    throw AppError.notFound('Purchase not found');
  }

  // Return purchase status
  ctx.body = {
    data: {
      status: purchase.status,
      course: purchase.course
        ? {
            id: purchase.course.id,
            title: purchase.course.title,
            slug: purchase.course.slug,
          }
        : null,
      completedAt: purchase.purchasedAt,
    },
  };
}

/**
 * List user's purchases
 * GET /payments/purchases
 */
export async function listPurchases(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { page = 1, limit = 20, status } = ctx.query as {
    page?: number;
    limit?: number;
    status?: PurchaseStatus;
  };

  const offset = (Number(page) - 1) * Number(limit);
  const where: Record<string, unknown> = { userId: user.userId };

  if (status) {
    where.status = status;
  }

  const { rows: purchases, count } = await Purchase.findAndCountAll({
    where,
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'title', 'slug', 'thumbnailUrl'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  ctx.body = {
    data: purchases,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count,
      totalPages: Math.ceil(count / Number(limit)),
    },
  };
}

/**
 * Get a single purchase
 * GET /payments/purchases/:id
 */
export async function getPurchase(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { id } = ctx.params;

  const purchase = await Purchase.findOne({
    where: { id, userId: user.userId },
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'title', 'slug', 'thumbnailUrl', 'description'],
      },
    ],
  });

  if (!purchase) {
    throw AppError.notFound('Purchase not found');
  }

  ctx.body = { data: purchase };
}

/**
 * Process a refund for a purchase (admin only)
 * POST /payments/:purchaseId/refund
 */
export async function processRefund(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { purchaseId } = ctx.params;
  const { reason, amount, stripeReason } = ctx.request.body as ProcessRefundBody;

  // Verify admin permissions (role check is done in route middleware, but double check)
  if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.TENANT_ADMIN) {
    throw AppError.forbidden('Admin access required');
  }

  // Find purchase
  const purchase = await Purchase.findByPk(purchaseId, {
    include: [{ model: Course, as: 'course' }],
  });

  if (!purchase) {
    throw AppError.notFound('Purchase not found');
  }

  // Only completed purchases can be refunded
  if (purchase.status !== PurchaseStatus.COMPLETED) {
    throw new AppError(
      `Cannot refund a purchase with status: ${purchase.status}`,
      400,
      'INVALID_PURCHASE_STATUS'
    );
  }

  // Verify payment intent exists
  if (!purchase.stripePaymentIntentId) {
    throw new AppError(
      'Purchase has no associated payment intent',
      400,
      'NO_PAYMENT_INTENT'
    );
  }

  // Determine if this is a partial refund
  const purchaseAmountCents = Math.round(Number(purchase.amount) * 100);
  const isPartialRefund = amount !== undefined && amount < purchaseAmountCents;

  // Create refund in Stripe
  const refundResult = await stripeService.createRefund({
    paymentIntentId: purchase.stripePaymentIntentId,
    amount: amount, // undefined for full refund
    reason: stripeReason || 'requested_by_customer',
    metadata: {
      purchaseId: purchase.id,
      userId: purchase.userId,
      courseId: purchase.courseId,
      refundedBy: user.userId,
    },
  });

  // Update purchase in database
  const refundAmountInCurrency = refundResult.amount / 100;
  await purchase.update({
    status: PurchaseStatus.REFUNDED,
    stripeRefundId: refundResult.refundId,
    refundedAt: new Date(),
    refundReason: reason || null,
    refundAmount: refundAmountInCurrency,
    isPartialRefund,
  });

  logger.info(
    {
      purchaseId: purchase.id,
      refundId: refundResult.refundId,
      amount: refundAmountInCurrency,
      isPartialRefund,
      refundedBy: user.userId,
    },
    'Purchase refunded'
  );

  ctx.body = {
    data: {
      id: purchase.id,
      status: purchase.status,
      refundId: refundResult.refundId,
      refundAmount: refundAmountInCurrency,
      refundedAt: purchase.refundedAt,
      isPartialRefund,
      course: purchase.course
        ? {
            id: purchase.course.id,
            title: purchase.course.title,
            slug: purchase.course.slug,
          }
        : null,
    },
  };
}

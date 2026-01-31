import type { Context } from 'koa';
import { Op } from 'sequelize';
import { Course, Purchase, User } from '../database/models/index.js';
import { CourseStatus, PurchaseStatus, RefundRequestStatus, UserRole } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { stripeService } from '../services/stripe/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type {
  CreateCourseCheckoutBody,
  VerifyPurchaseBody,
  ProcessRefundBody,
  RequestRefundBody,
  ReviewRefundRequestBody,
} from './schemas.js';

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
    success: true,
    data: {
      purchases: purchases.map((p) => ({
        id: p.id,
        courseId: p.courseId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        purchasedAt: p.purchasedAt,
        createdAt: p.createdAt,
        // Refund request fields
        refundRequestStatus: p.refundRequestStatus,
        refundRequestedAt: p.refundRequestedAt,
        refundRejectionReason: p.refundRejectionReason,
        // Course info
        course: p.course
          ? {
              id: p.course.id,
              title: p.course.title,
              slug: p.course.slug,
              thumbnailUrl: p.course.thumbnailUrl,
            }
          : null,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: Math.ceil(count / Number(limit)),
      },
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

/**
 * Request a refund (for learners)
 * POST /payments/:purchaseId/request-refund
 *
 * If purchase was made < 1 hour ago: auto-refund
 * If purchase was made > 1 hour ago: create pending request for admin review
 */
export async function requestRefund(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { purchaseId } = ctx.params;
  const { reason } = ctx.request.body as RequestRefundBody;

  // Find purchase belonging to user
  const purchase = await Purchase.findOne({
    where: {
      id: purchaseId,
      userId: user.userId,
    },
    include: [{ model: Course, as: 'course' }],
  });

  if (!purchase) {
    throw AppError.notFound('Purchase not found');
  }

  // Only completed purchases can be refunded
  if (purchase.status !== PurchaseStatus.COMPLETED) {
    throw new AppError(
      `Cannot request refund for a purchase with status: ${purchase.status}`,
      400,
      'INVALID_PURCHASE_STATUS'
    );
  }

  // Check if already has a pending refund request
  if (purchase.refundRequestStatus === RefundRequestStatus.PENDING) {
    throw new AppError(
      'A refund request is already pending for this purchase',
      400,
      'REFUND_REQUEST_PENDING'
    );
  }

  // Check if already refunded
  if (purchase.refundRequestStatus === RefundRequestStatus.APPROVED ||
      purchase.refundRequestStatus === RefundRequestStatus.AUTO_APPROVED) {
    throw new AppError(
      'This purchase has already been refunded',
      400,
      'ALREADY_REFUNDED'
    );
  }

  // Check if eligible for auto-refund (within 1 hour)
  const isAutoRefund = purchase.isEligibleForAutoRefund;

  if (isAutoRefund) {
    // Auto-refund: process immediately
    if (!purchase.stripePaymentIntentId) {
      throw new AppError(
        'Purchase has no associated payment intent',
        400,
        'NO_PAYMENT_INTENT'
      );
    }

    // Create refund in Stripe
    const refundResult = await stripeService.createRefund({
      paymentIntentId: purchase.stripePaymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        purchaseId: purchase.id,
        userId: purchase.userId,
        courseId: purchase.courseId,
        autoRefund: 'true',
      },
    });

    // Update purchase
    const refundAmountInCurrency = refundResult.amount / 100;
    await purchase.update({
      status: PurchaseStatus.REFUNDED,
      stripeRefundId: refundResult.refundId,
      refundedAt: new Date(),
      refundReason: reason,
      refundAmount: refundAmountInCurrency,
      isPartialRefund: false,
      refundRequestStatus: RefundRequestStatus.AUTO_APPROVED,
      refundRequestedAt: new Date(),
      refundRequestReason: reason,
    });

    logger.info(
      {
        purchaseId: purchase.id,
        refundId: refundResult.refundId,
        amount: refundAmountInCurrency,
        autoRefund: true,
      },
      'Auto-refund processed'
    );

    ctx.body = {
      data: {
        id: purchase.id,
        status: 'refunded',
        refundRequestStatus: RefundRequestStatus.AUTO_APPROVED,
        message: 'Refund processed automatically',
        refundId: refundResult.refundId,
        refundAmount: refundAmountInCurrency,
        course: purchase.course
          ? {
              id: purchase.course.id,
              title: purchase.course.title,
              slug: purchase.course.slug,
            }
          : null,
      },
    };
  } else {
    // Manual review required
    await purchase.update({
      refundRequestStatus: RefundRequestStatus.PENDING,
      refundRequestedAt: new Date(),
      refundRequestReason: reason,
    });

    logger.info(
      {
        purchaseId: purchase.id,
        userId: user.userId,
      },
      'Refund request submitted for review'
    );

    ctx.body = {
      data: {
        id: purchase.id,
        status: purchase.status,
        refundRequestStatus: RefundRequestStatus.PENDING,
        message: 'Refund request submitted for review',
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
}

/**
 * List pending refund requests (admin only)
 * GET /payments/refund-requests
 */
export async function listRefundRequests(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { status = 'pending', page = 1, limit = 20 } = ctx.query as {
    status?: string;
    page?: number;
    limit?: number;
  };

  // Verify super admin permissions (refunds are B2C only)
  if (user.role !== UserRole.SUPER_ADMIN) {
    throw AppError.forbidden('Super admin access required');
  }

  const offset = (Number(page) - 1) * Number(limit);
  const where: Record<string, unknown> = {
    // Only B2C purchases (no tenant) can have refund requests
    tenantId: null,
  };

  if (status === 'pending') {
    where.refundRequestStatus = RefundRequestStatus.PENDING;
  } else if (status === 'all') {
    where.refundRequestStatus = {
      [Op.ne]: RefundRequestStatus.NONE,
    };
  } else if (status === 'reviewed') {
    where.refundRequestStatus = {
      [Op.in]: [RefundRequestStatus.APPROVED, RefundRequestStatus.REJECTED, RefundRequestStatus.AUTO_APPROVED],
    };
  }

  const { rows: purchases, count } = await Purchase.findAndCountAll({
    where,
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'title', 'slug'],
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName'],
      },
    ],
    order: [['refundRequestedAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  ctx.body = {
    success: true,
    data: {
      requests: purchases.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        refundRequestStatus: p.refundRequestStatus,
        refundRequestedAt: p.refundRequestedAt,
        refundRequestReason: p.refundRequestReason,
        purchasedAt: p.purchasedAt,
        user: p.user
          ? {
              id: p.user.id,
              email: p.user.email,
              firstName: p.user.firstName,
              lastName: p.user.lastName,
            }
          : null,
        course: p.course
          ? {
              id: p.course.id,
              title: p.course.title,
              slug: p.course.slug,
            }
          : null,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: Math.ceil(count / Number(limit)),
      },
    },
  };
}

/**
 * Review a refund request (admin only)
 * POST /payments/:purchaseId/review-refund
 */
export async function reviewRefundRequest(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { purchaseId } = ctx.params;
  const { action, rejectionReason } = ctx.request.body as ReviewRefundRequestBody;

  // Verify super admin permissions (refunds are B2C only)
  if (user.role !== UserRole.SUPER_ADMIN) {
    throw AppError.forbidden('Super admin access required');
  }

  // Find purchase
  const purchase = await Purchase.findByPk(purchaseId, {
    include: [{ model: Course, as: 'course' }],
  });

  if (!purchase) {
    throw AppError.notFound('Purchase not found');
  }

  // Only B2C purchases can be refunded through this flow
  if (purchase.tenantId) {
    throw AppError.forbidden('Tenant purchases cannot be refunded through this flow');
  }

  // Verify it's a pending request
  if (purchase.refundRequestStatus !== RefundRequestStatus.PENDING) {
    throw new AppError(
      `Cannot review a refund request with status: ${purchase.refundRequestStatus}`,
      400,
      'INVALID_REQUEST_STATUS'
    );
  }

  if (action === 'approve') {
    // Process the refund
    if (!purchase.stripePaymentIntentId) {
      throw new AppError(
        'Purchase has no associated payment intent',
        400,
        'NO_PAYMENT_INTENT'
      );
    }

    // Create refund in Stripe
    const refundResult = await stripeService.createRefund({
      paymentIntentId: purchase.stripePaymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        purchaseId: purchase.id,
        userId: purchase.userId,
        courseId: purchase.courseId,
        approvedBy: user.userId,
      },
    });

    // Update purchase
    const refundAmountInCurrency = refundResult.amount / 100;
    await purchase.update({
      status: PurchaseStatus.REFUNDED,
      stripeRefundId: refundResult.refundId,
      refundedAt: new Date(),
      refundReason: purchase.refundRequestReason,
      refundAmount: refundAmountInCurrency,
      isPartialRefund: false,
      refundRequestStatus: RefundRequestStatus.APPROVED,
      refundReviewedBy: user.userId,
      refundReviewedAt: new Date(),
    });

    logger.info(
      {
        purchaseId: purchase.id,
        refundId: refundResult.refundId,
        approvedBy: user.userId,
      },
      'Refund request approved'
    );

    ctx.body = {
      data: {
        id: purchase.id,
        status: PurchaseStatus.REFUNDED,
        refundRequestStatus: RefundRequestStatus.APPROVED,
        refundId: refundResult.refundId,
        refundAmount: refundAmountInCurrency,
      },
    };
  } else {
    // Reject the request
    if (!rejectionReason) {
      throw new AppError(
        'Rejection reason is required',
        400,
        'REJECTION_REASON_REQUIRED'
      );
    }

    await purchase.update({
      refundRequestStatus: RefundRequestStatus.REJECTED,
      refundReviewedBy: user.userId,
      refundReviewedAt: new Date(),
      refundRejectionReason: rejectionReason,
    });

    logger.info(
      {
        purchaseId: purchase.id,
        rejectedBy: user.userId,
        reason: rejectionReason,
      },
      'Refund request rejected'
    );

    ctx.body = {
      data: {
        id: purchase.id,
        status: purchase.status,
        refundRequestStatus: RefundRequestStatus.REJECTED,
        rejectionReason,
      },
    };
  }
}

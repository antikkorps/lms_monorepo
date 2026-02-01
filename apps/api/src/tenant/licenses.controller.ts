import type { Context } from 'koa';
import {
  Course,
  User,
  Tenant,
  TenantCourseLicense,
  TenantCourseLicenseAssignment,
} from '../database/models/index.js';
import { CourseStatus, PurchaseStatus, LicenseType, UserRole } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { stripeService } from '../services/stripe/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { sequelize } from '../database/sequelize.js';

interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

function getAuthenticatedTenantAdmin(ctx: Context): AuthenticatedUser {
  const user = ctx.state.user as AuthenticatedUser | undefined;
  if (!user) {
    throw AppError.unauthorized('Authentication required');
  }
  if (!user.tenantId) {
    throw AppError.forbidden('Tenant access required');
  }
  if (user.role !== UserRole.TENANT_ADMIN && user.role !== UserRole.MANAGER && user.role !== UserRole.SUPER_ADMIN) {
    throw AppError.forbidden('Admin or manager access required');
  }
  return user;
}

/**
 * Create a Stripe Checkout session for purchasing a course license
 * POST /tenant/licenses/checkout
 *
 * B2B supports both card and bank transfer payments
 */
export async function createLicenseCheckout(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const { courseId, licenseType, seats } = ctx.request.body as {
    courseId: string;
    licenseType: 'unlimited' | 'seats';
    seats?: number;
  };

  if (!courseId) {
    throw AppError.badRequest('Course ID is required');
  }

  if (!licenseType || !['unlimited', 'seats'].includes(licenseType)) {
    throw AppError.badRequest('License type must be "unlimited" or "seats"');
  }

  if (licenseType === 'seats' && (!seats || seats < 1)) {
    throw AppError.badRequest('Number of seats is required for seats license');
  }

  // Get course
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  if (course.status !== CourseStatus.PUBLISHED) {
    throw AppError.badRequest('Course is not available for purchase');
  }

  if (course.isFree) {
    throw AppError.badRequest('This course is free. No license purchase required.');
  }

  // Get tenant
  const tenant = await Tenant.findByPk(user.tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  // Check if tenant already has an active license for this course
  const existingLicense = await TenantCourseLicense.findOne({
    where: {
      tenantId: user.tenantId,
      courseId,
      status: PurchaseStatus.COMPLETED,
    },
  });

  if (existingLicense) {
    throw new AppError('Your organization already has an active license for this course', 409, 'LICENSE_EXISTS');
  }

  // Calculate price
  // For unlimited: course price * multiplier (e.g., 10x)
  // For seats: course price * seats (with potential volume discount)
  const coursePrice = Number(course.price);
  let totalPrice: number;
  let description: string;

  if (licenseType === 'unlimited') {
    // Unlimited license costs 10x the course price
    totalPrice = coursePrice * 10;
    description = `Unlimited license for "${course.title}"`;
  } else {
    // Per-seat pricing with volume discounts
    const seatCount = seats!;
    let pricePerSeat = coursePrice;

    // Volume discounts
    if (seatCount >= 50) {
      pricePerSeat = coursePrice * 0.7; // 30% discount
    } else if (seatCount >= 20) {
      pricePerSeat = coursePrice * 0.8; // 20% discount
    } else if (seatCount >= 10) {
      pricePerSeat = coursePrice * 0.9; // 10% discount
    }

    totalPrice = pricePerSeat * seatCount;
    description = `${seatCount} seat license for "${course.title}"`;
  }

  const priceInCents = Math.round(totalPrice * 100);

  // Create Stripe checkout session with B2B payment options (card + bank transfer)
  const { sessionId, url } = await stripeService.createB2BLicenseCheckoutSession({
    tenantId: user.tenantId,
    courseId,
    userId: user.userId,
    licenseType: licenseType as LicenseType,
    seats: licenseType === 'seats' ? seats! : null,
    courseName: course.title,
    description,
    priceInCents,
    currency: course.currency,
    customerEmail: user.email,
    stripeCustomerId: tenant.stripeCustomerId || undefined,
    successUrl: `${config.frontendUrl}/admin/licenses/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${config.frontendUrl}/admin/licenses?course=${course.slug}`,
  });

  // Create pending license record
  await TenantCourseLicense.create({
    tenantId: user.tenantId,
    courseId,
    purchasedById: user.userId,
    licenseType: licenseType as LicenseType,
    seatsTotal: licenseType === 'seats' ? seats : null,
    seatsUsed: 0,
    amount: totalPrice,
    currency: course.currency,
    status: PurchaseStatus.PENDING,
    stripeCheckoutSessionId: sessionId,
  });

  logger.info(
    { tenantId: user.tenantId, courseId, licenseType, seats, sessionId },
    'License checkout session created'
  );

  ctx.body = {
    data: {
      sessionId,
      url,
      amount: totalPrice,
      currency: course.currency,
    },
  };
}

/**
 * List tenant's course licenses
 * GET /tenant/licenses
 */
export async function listLicenses(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const { status, page = 1, limit = 20 } = ctx.query as {
    status?: string;
    page?: number;
    limit?: number;
  };

  const offset = (Number(page) - 1) * Number(limit);
  const where: Record<string, unknown> = { tenantId: user.tenantId };

  if (status === 'active') {
    where.status = PurchaseStatus.COMPLETED;
  } else if (status === 'pending') {
    where.status = PurchaseStatus.PENDING;
  }

  const { rows: licenses, count } = await TenantCourseLicense.findAndCountAll({
    where,
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'title', 'slug', 'thumbnailUrl'],
      },
      {
        model: User,
        as: 'purchasedBy',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  ctx.body = {
    success: true,
    data: {
      licenses: licenses.map((l) => ({
        id: l.id,
        courseId: l.courseId,
        licenseType: l.licenseType,
        seatsTotal: l.seatsTotal,
        seatsUsed: l.seatsUsed,
        availableSeats: l.availableSeats,
        amount: Number(l.amount),
        currency: l.currency,
        status: l.status,
        purchasedAt: l.purchasedAt,
        course: l.course,
        purchasedBy: l.purchasedBy,
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
 * Get license details with assignments
 * GET /tenant/licenses/:id
 */
export async function getLicense(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const { id } = ctx.params;

  const license = await TenantCourseLicense.findOne({
    where: { id, tenantId: user.tenantId },
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'title', 'slug', 'thumbnailUrl', 'description'],
      },
      {
        model: User,
        as: 'purchasedBy',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      },
      {
        model: TenantCourseLicenseAssignment,
        as: 'assignments',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
          },
        ],
      },
    ],
  });

  if (!license) {
    throw AppError.notFound('License not found');
  }

  ctx.body = {
    data: {
      id: license.id,
      courseId: license.courseId,
      licenseType: license.licenseType,
      seatsTotal: license.seatsTotal,
      seatsUsed: license.seatsUsed,
      availableSeats: license.availableSeats,
      amount: Number(license.amount),
      currency: license.currency,
      status: license.status,
      purchasedAt: license.purchasedAt,
      course: license.course,
      purchasedBy: license.purchasedBy,
      assignments: license.assignments?.map((a) => ({
        id: a.id,
        userId: a.userId,
        assignedAt: a.assignedAt,
        user: a.user,
      })),
    },
  };
}

/**
 * Assign a user to a seat-based license
 * POST /tenant/licenses/:id/assign
 */
export async function assignSeat(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const { id } = ctx.params;
  const { userId } = ctx.request.body as { userId: string };

  if (!userId) {
    throw AppError.badRequest('User ID is required');
  }

  const license = await TenantCourseLicense.findOne({
    where: { id, tenantId: user.tenantId },
  });

  if (!license) {
    throw AppError.notFound('License not found');
  }

  if (license.status !== PurchaseStatus.COMPLETED) {
    throw AppError.badRequest('License is not active');
  }

  if (license.licenseType === LicenseType.UNLIMITED) {
    throw AppError.badRequest('Unlimited licenses do not require seat assignment');
  }

  if (!license.hasAvailableSeats) {
    throw AppError.badRequest('No available seats in this license');
  }

  // Verify user belongs to tenant
  const targetUser = await User.findOne({
    where: { id: userId, tenantId: user.tenantId },
  });

  if (!targetUser) {
    throw AppError.notFound('User not found in your organization');
  }

  // Check if user already has this assignment
  const existingAssignment = await TenantCourseLicenseAssignment.findOne({
    where: { licenseId: id, userId },
  });

  if (existingAssignment) {
    throw new AppError('User is already assigned to this license', 409, 'ALREADY_ASSIGNED');
  }

  // Create assignment and increment seats used
  await sequelize.transaction(async (t) => {
    await TenantCourseLicenseAssignment.create(
      {
        licenseId: id,
        userId,
        assignedById: user.userId,
        assignedAt: new Date(),
      },
      { transaction: t }
    );

    await license.increment('seatsUsed', { transaction: t });
  });

  logger.info(
    { licenseId: id, userId, assignedBy: user.userId },
    'User assigned to license'
  );

  ctx.body = {
    success: true,
    data: {
      message: 'User assigned successfully',
      seatsUsed: license.seatsUsed + 1,
      seatsTotal: license.seatsTotal,
    },
  };
}

/**
 * Remove a user from a seat-based license
 * DELETE /tenant/licenses/:id/assignments/:userId
 */
export async function unassignSeat(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const { id, userId } = ctx.params;

  const license = await TenantCourseLicense.findOne({
    where: { id, tenantId: user.tenantId },
  });

  if (!license) {
    throw AppError.notFound('License not found');
  }

  if (license.licenseType === LicenseType.UNLIMITED) {
    throw AppError.badRequest('Unlimited licenses do not have seat assignments');
  }

  const assignment = await TenantCourseLicenseAssignment.findOne({
    where: { licenseId: id, userId },
  });

  if (!assignment) {
    throw AppError.notFound('Assignment not found');
  }

  // Remove assignment and decrement seats used
  await sequelize.transaction(async (t) => {
    await assignment.destroy({ transaction: t });
    await license.decrement('seatsUsed', { transaction: t });
  });

  logger.info(
    { licenseId: id, userId, removedBy: user.userId },
    'User unassigned from license'
  );

  ctx.body = {
    success: true,
    data: {
      message: 'User unassigned successfully',
      seatsUsed: license.seatsUsed - 1,
      seatsTotal: license.seatsTotal,
    },
  };
}

/**
 * Request refund for a license (tenant admin only)
 * POST /tenant/licenses/:id/refund
 */
export async function requestLicenseRefund(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const { id } = ctx.params;
  const { reason } = ctx.request.body as { reason?: string };

  // Only tenant admin can request refunds
  if (user.role !== UserRole.TENANT_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    throw AppError.forbidden('Only tenant administrators can request refunds');
  }

  const license = await TenantCourseLicense.findOne({
    where: { id, tenantId: user.tenantId },
    include: [{ model: Course, as: 'course' }],
  });

  if (!license) {
    throw AppError.notFound('License not found');
  }

  if (license.status !== PurchaseStatus.COMPLETED) {
    throw AppError.badRequest('Only active licenses can be refunded');
  }

  if (!license.stripePaymentIntentId) {
    throw AppError.badRequest('License has no associated payment');
  }

  // Process refund via Stripe
  const refundResult = await stripeService.createRefund({
    paymentIntentId: license.stripePaymentIntentId,
    reason: 'requested_by_customer',
    metadata: {
      licenseId: license.id,
      tenantId: user.tenantId,
      courseId: license.courseId,
      refundedBy: user.userId,
      type: 'b2b_license',
    },
  });

  // Update license
  const refundAmountInCurrency = refundResult.amount / 100;
  await license.update({
    status: PurchaseStatus.REFUNDED,
    stripeRefundId: refundResult.refundId,
    refundedAt: new Date(),
    refundReason: reason || null,
    refundAmount: refundAmountInCurrency,
    isPartialRefund: false,
  });

  // Remove all assignments
  await TenantCourseLicenseAssignment.destroy({
    where: { licenseId: id },
  });

  logger.info(
    { licenseId: id, tenantId: user.tenantId, refundId: refundResult.refundId },
    'License refunded'
  );

  ctx.body = {
    data: {
      id: license.id,
      status: PurchaseStatus.REFUNDED,
      refundId: refundResult.refundId,
      refundAmount: refundAmountInCurrency,
      course: license.course
        ? {
            id: license.course.id,
            title: license.course.title,
          }
        : null,
    },
  };
}

/**
 * Check if a user has access to a course via tenant license
 * This is a utility function for course access middleware
 */
export async function hasLicenseAccess(
  userId: string,
  courseId: string,
  tenantId: string | null
): Promise<boolean> {
  if (!tenantId) return false;

  // Find active license for this tenant and course
  const license = await TenantCourseLicense.findOne({
    where: {
      tenantId,
      courseId,
      status: PurchaseStatus.COMPLETED,
    },
  });

  if (!license) return false;

  // Unlimited license: all tenant members have access
  if (license.licenseType === LicenseType.UNLIMITED) {
    return true;
  }

  // Seats license: check if user is assigned
  const assignment = await TenantCourseLicenseAssignment.findOne({
    where: {
      licenseId: license.id,
      userId,
    },
  });

  return !!assignment;
}

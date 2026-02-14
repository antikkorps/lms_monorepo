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
import { getDiscountTiers, calculateLicensePrice } from './licenses.pricing.js';

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

  // Ensure tenant has a Stripe customer (required for bank transfer payments)
  let stripeCustomerId = tenant.stripeCustomerId;
  if (!stripeCustomerId) {
    logger.info({ tenantId: user.tenantId }, 'Creating Stripe customer for tenant');
    const { customerId } = await stripeService.createCustomer({
      email: user.email,
      name: tenant.name,
      metadata: {
        tenantId: user.tenantId,
        tenantName: tenant.name,
      },
    });
    stripeCustomerId = customerId;

    // Save the customer ID to the tenant
    await tenant.update({ stripeCustomerId });
    logger.info({ tenantId: user.tenantId, stripeCustomerId }, 'Stripe customer created for tenant');
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

  // Calculate price using configurable volume discount tiers
  const coursePrice = Number(course.price);
  const tiers = await getDiscountTiers(user.tenantId);
  const pricing = calculateLicensePrice(coursePrice, licenseType, seats || null, tiers);

  const totalPrice = pricing.totalPrice;
  const description = licenseType === 'unlimited'
    ? `Unlimited license for "${course.title}"`
    : `${seats} seat license for "${course.title}"`;

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
    stripeCustomerId,
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
  } else if (status === 'expired') {
    where.status = PurchaseStatus.EXPIRED;
  } else if (status === 'refunded') {
    where.status = PurchaseStatus.REFUNDED;
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
        expiresAt: l.expiresAt,
        renewedAt: l.renewedAt,
        renewalCount: l.renewalCount,
        isExpired: l.isExpired,
        isExpiringSoon: l.isExpiringSoon,
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
      expiresAt: license.expiresAt,
      renewedAt: license.renewedAt,
      renewalCount: license.renewalCount,
      isExpired: license.isExpired,
      isExpiringSoon: license.isExpiringSoon,
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

  // Check expiration
  if (license.isExpired) return false;

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

/**
 * Get license pricing preview with discount tiers
 * GET /tenant/licenses/pricing
 */
export async function getLicensePricing(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const { courseId, licenseType = 'seats', seats } = ctx.query as {
    courseId?: string;
    licenseType?: string;
    seats?: string;
  };

  if (!courseId) {
    throw AppError.badRequest('Course ID is required');
  }

  const course = await Course.findByPk(courseId, { attributes: ['id', 'price', 'currency', 'title'] });
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  const tiers = await getDiscountTiers(user.tenantId);
  const seatCount = seats ? Number.parseInt(seats, 10) : null;
  const pricing = calculateLicensePrice(Number(course.price), licenseType, seatCount, tiers);

  ctx.body = {
    data: {
      ...pricing,
      currency: course.currency,
      courseTitle: course.title,
    },
  };
}

/**
 * Renew an expired or expiring license
 * POST /tenant/licenses/:id/renew
 */
export async function renewLicense(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const { id } = ctx.params;

  const license = await TenantCourseLicense.findOne({
    where: { id, tenantId: user.tenantId },
    include: [{ model: Course, as: 'course' }],
  });

  if (!license) {
    throw AppError.notFound('License not found');
  }

  if (!license.course) {
    throw AppError.badRequest('Course not found for this license');
  }

  // Get tenant for Stripe customer
  const tenant = await Tenant.findByPk(user.tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  // Recalculate price based on current tiers
  const coursePrice = Number(license.course.price);
  const tiers = await getDiscountTiers(user.tenantId);
  const pricing = calculateLicensePrice(coursePrice, license.licenseType, license.seatsTotal, tiers);
  const priceInCents = Math.round(pricing.totalPrice * 100);

  const description = license.licenseType === LicenseType.UNLIMITED
    ? `Renewal: Unlimited license for "${license.course.title}"`
    : `Renewal: ${license.seatsTotal} seat license for "${license.course.title}"`;

  // Create Stripe checkout with renewal metadata
  const { sessionId, url } = await stripeService.createB2BLicenseCheckoutSession({
    tenantId: user.tenantId,
    courseId: license.courseId,
    userId: user.userId,
    licenseType: license.licenseType as LicenseType,
    seats: license.seatsTotal,
    courseName: license.course.title,
    description,
    priceInCents,
    currency: license.course.currency,
    customerEmail: user.email,
    stripeCustomerId: tenant.stripeCustomerId || undefined,
    successUrl: `${config.frontendUrl}/admin/licenses/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${config.frontendUrl}/admin/licenses/${license.id}`,
    renewalLicenseId: license.id,
  });

  logger.info(
    { licenseId: id, tenantId: user.tenantId, sessionId },
    'License renewal checkout created'
  );

  ctx.body = {
    data: {
      sessionId,
      url,
      amount: pricing.totalPrice,
      currency: license.course.currency,
    },
  };
}

/**
 * Update volume discount tiers for a tenant (super admin only)
 * PUT /admin/tenants/:id/discount-tiers
 */
export async function updateTenantDiscountTiers(ctx: Context): Promise<void> {
  const { id } = ctx.params;
  const { tiers } = ctx.request.body as { tiers: Array<{ minSeats: number; discountPercent: number }> };

  if (!Array.isArray(tiers) || tiers.length === 0) {
    throw AppError.badRequest('Tiers must be a non-empty array');
  }

  for (const tier of tiers) {
    if (typeof tier.minSeats !== 'number' || tier.minSeats < 1) {
      throw AppError.badRequest('Each tier must have a positive minSeats value');
    }
    if (typeof tier.discountPercent !== 'number' || tier.discountPercent < 0 || tier.discountPercent > 100) {
      throw AppError.badRequest('Each tier must have a discountPercent between 0 and 100');
    }
  }

  const tenant = await Tenant.findByPk(id);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  const settings = { ...tenant.settings, volumeDiscountTiers: tiers };
  await tenant.update({ settings });

  logger.info({ tenantId: id, tiersCount: tiers.length }, 'Tenant discount tiers updated');

  ctx.body = {
    data: {
      tenantId: id,
      volumeDiscountTiers: tiers,
    },
  };
}

/**
 * Reset volume discount tiers for a tenant to global defaults (super admin only)
 * DELETE /admin/tenants/:id/discount-tiers
 */
export async function deleteTenantDiscountTiers(ctx: Context): Promise<void> {
  const { id } = ctx.params;

  const tenant = await Tenant.findByPk(id);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  const settings = { ...tenant.settings };
  delete settings.volumeDiscountTiers;
  await tenant.update({ settings });

  logger.info({ tenantId: id }, 'Tenant discount tiers reset to defaults');

  ctx.body = {
    data: {
      tenantId: id,
      volumeDiscountTiers: config.licensing.volumeDiscountTiers,
      isDefault: true,
    },
  };
}

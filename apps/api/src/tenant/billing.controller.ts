import type { Context } from 'koa';
import { Tenant } from '../database/models/index.js';
import { UserRole, SubscriptionStatus } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { stripeService } from '../services/stripe/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

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
  if (user.role !== UserRole.TENANT_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    throw AppError.forbidden('Tenant admin access required');
  }
  return user;
}

/**
 * Create a Stripe Checkout session for tenant subscription
 * POST /tenant/billing/checkout
 */
export async function createSubscriptionCheckout(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const { planPriceId, seats } = ctx.request.body as {
    planPriceId: string;
    seats?: number;
  };

  if (!planPriceId) {
    throw AppError.badRequest('Plan price ID is required');
  }

  const tenant = await Tenant.findByPk(user.tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  // Check if tenant already has an active subscription
  if (
    tenant.stripeSubscriptionId &&
    tenant.subscriptionStatus === SubscriptionStatus.ACTIVE
  ) {
    throw AppError.conflict(
      'Tenant already has an active subscription. Use the customer portal to modify it.'
    );
  }

  const seatCount = seats || tenant.seatsPurchased || 10;

  const { sessionId, url } = await stripeService.createSubscriptionCheckout({
    tenantId: tenant.id,
    tenantName: tenant.name,
    adminEmail: user.email,
    seats: seatCount,
    planPriceId,
    stripeCustomerId: tenant.stripeCustomerId || undefined,
    successUrl: `${config.frontendUrl}/admin/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${config.frontendUrl}/admin/billing`,
  });

  logger.info(
    { tenantId: tenant.id, planPriceId, seats: seatCount },
    'Subscription checkout session created'
  );

  ctx.body = {
    data: {
      sessionId,
      url,
    },
  };
}

/**
 * Create a Stripe Customer Portal session
 * POST /tenant/billing/portal
 */
export async function createPortalSession(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);

  const tenant = await Tenant.findByPk(user.tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  if (!tenant.stripeCustomerId) {
    throw AppError.badRequest(
      'No billing account found. Please set up a subscription first.'
    );
  }

  const { url } = await stripeService.createCustomerPortal({
    stripeCustomerId: tenant.stripeCustomerId,
    returnUrl: `${config.frontendUrl}/admin/billing`,
  });

  ctx.body = {
    data: { url },
  };
}

/**
 * Get current subscription status
 * GET /tenant/billing/subscription
 */
export async function getSubscriptionStatus(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);

  const tenant = await Tenant.findByPk(user.tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  let subscription = null;

  if (tenant.stripeSubscriptionId) {
    try {
      const stripeSub = await stripeService.retrieveSubscription(
        tenant.stripeSubscriptionId
      );

      // Extract billing period from billing_cycle_anchor
      const billingCycleAnchor = stripeSub.billing_cycle_anchor;
      const cancelAt = stripeSub.cancel_at;

      subscription = {
        id: stripeSub.id,
        status: stripeSub.status,
        billingCycleAnchor: billingCycleAnchor ? new Date(billingCycleAnchor * 1000) : null,
        cancelAt: cancelAt ? new Date(cancelAt * 1000) : null,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        seats: stripeSub.items.data[0]?.quantity || tenant.seatsPurchased,
        priceId: stripeSub.items.data[0]?.price.id,
        unitAmount: stripeSub.items.data[0]?.price.unit_amount,
        currency: stripeSub.items.data[0]?.price.currency,
      };
    } catch (error) {
      logger.error(
        {
          tenantId: tenant.id,
          subscriptionId: tenant.stripeSubscriptionId,
          error: error instanceof Error ? error.message : 'Unknown',
        },
        'Failed to retrieve Stripe subscription'
      );
    }
  }

  ctx.body = {
    data: {
      hasSubscription: !!tenant.stripeSubscriptionId,
      hasCustomer: !!tenant.stripeCustomerId,
      subscriptionStatus: tenant.subscriptionStatus,
      seatsPurchased: tenant.seatsPurchased,
      seatsUsed: tenant.seatsUsed,
      subscription,
    },
  };
}

/**
 * Update subscription seats
 * PATCH /tenant/billing/seats
 */
export async function updateSeats(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const { seats } = ctx.request.body as { seats: number };

  if (!seats || seats < 1) {
    throw AppError.badRequest('Seats must be at least 1');
  }

  const tenant = await Tenant.findByPk(user.tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  if (!tenant.stripeSubscriptionId) {
    throw AppError.badRequest('No active subscription to modify');
  }

  // Prevent reducing seats below current usage
  if (seats < tenant.seatsUsed) {
    throw AppError.badRequest(
      `Cannot reduce seats below current usage (${tenant.seatsUsed} seats in use)`
    );
  }

  // Update subscription in Stripe
  const subscription = await stripeService.updateSubscriptionSeats(
    tenant.stripeSubscriptionId,
    seats
  );

  // Update local record
  await tenant.update({
    seatsPurchased: subscription.items.data[0]?.quantity || seats,
  });

  logger.info(
    { tenantId: tenant.id, oldSeats: tenant.seatsPurchased, newSeats: seats },
    'Subscription seats updated'
  );

  ctx.body = {
    data: {
      seatsPurchased: tenant.seatsPurchased,
      prorationAmount: subscription.latest_invoice
        ? (subscription.latest_invoice as { amount_due?: number }).amount_due
        : null,
    },
  };
}

/**
 * Cancel subscription
 * POST /tenant/billing/cancel
 */
export async function cancelSubscription(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const { immediately } = ctx.request.body as { immediately?: boolean };

  const tenant = await Tenant.findByPk(user.tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  if (!tenant.stripeSubscriptionId) {
    throw AppError.badRequest('No active subscription to cancel');
  }

  const subscription = await stripeService.cancelSubscription(
    tenant.stripeSubscriptionId,
    immediately || false
  );

  if (immediately) {
    await tenant.update({
      subscriptionStatus: SubscriptionStatus.CANCELLED,
    });
  }

  logger.info(
    { tenantId: tenant.id, immediately },
    'Subscription cancellation requested'
  );

  ctx.body = {
    data: {
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : null,
    },
  };
}

/**
 * Reactivate a cancelled subscription (before period end)
 * POST /tenant/billing/reactivate
 */
export async function reactivateSubscription(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);

  const tenant = await Tenant.findByPk(user.tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  if (!tenant.stripeSubscriptionId) {
    throw AppError.badRequest('No subscription to reactivate');
  }

  const subscription = await stripeService.reactivateSubscription(
    tenant.stripeSubscriptionId
  );

  await tenant.update({
    subscriptionStatus: SubscriptionStatus.ACTIVE,
  });

  logger.info({ tenantId: tenant.id }, 'Subscription reactivated');

  ctx.body = {
    data: {
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  };
}

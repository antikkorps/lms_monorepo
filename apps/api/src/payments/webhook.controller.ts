import type { Context } from 'koa';
import type Stripe from 'stripe';
import { Purchase, Tenant, TenantCourseLicense } from '../database/models/index.js';
import { PurchaseStatus, TenantStatus } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { stripeService } from '../services/stripe/index.js';
import { logger } from '../utils/logger.js';
import { onPurchaseConfirmed } from '../triggers/notification.triggers.js';

/**
 * Handle Stripe webhook events
 * POST /webhooks/stripe
 */
export async function handleStripeWebhook(ctx: Context): Promise<void> {
  const signature = ctx.get('stripe-signature');
  const rawBody = ctx.request.rawBodyBuffer;

  if (!signature) {
    throw new AppError('Missing Stripe signature', 400, 'WEBHOOK_SIGNATURE_INVALID');
  }

  if (!rawBody) {
    throw new AppError('Missing request body', 400, 'BAD_REQUEST');
  }

  const bodyBuffer = rawBody;

  let event: Stripe.Event;

  try {
    event = stripeService.constructWebhookEvent(bodyBuffer, signature);
  } catch (err) {
    logger.error(
      { error: err instanceof Error ? err.message : 'Unknown' },
      'Stripe webhook signature verification failed'
    );
    throw new AppError('Invalid webhook signature', 400, 'WEBHOOK_SIGNATURE_INVALID');
  }

  logger.info({ eventType: event.type, eventId: event.id }, 'Stripe webhook received');

  // Handle different event types
  switch (event.type) {
    // B2C - Course purchases
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    // B2B - Tenant subscriptions
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    // Refunds
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;

    default:
      logger.info({ eventType: event.type }, 'Unhandled Stripe event type');
  }

  ctx.status = 200;
  ctx.body = { received: true };
}

/**
 * Handle successful checkout session (B2C course purchase)
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const { courseId, userId, type } = session.metadata || {};

  // Route to appropriate handler based on type
  if (type === 'tenant_subscription') {
    await handleTenantSubscriptionCheckout(session);
    return;
  }

  if (type === 'b2b_license') {
    await handleB2BLicenseCheckout(session);
    return;
  }

  // Only handle course purchases below
  if (type !== 'course_purchase') {
    return;
  }

  if (!courseId || !userId) {
    logger.error(
      { sessionId: session.id },
      'Checkout session missing courseId or userId metadata'
    );
    return;
  }

  // Find pending purchase by session ID (idempotent check)
  const purchase = await Purchase.findOne({
    where: { stripeCheckoutSessionId: session.id },
  });

  if (!purchase) {
    logger.error(
      { sessionId: session.id, courseId, userId },
      'Purchase not found for checkout session'
    );
    return;
  }

  // Skip if already completed (idempotent)
  if (purchase.status === PurchaseStatus.COMPLETED) {
    logger.info(
      { purchaseId: purchase.id },
      'Purchase already completed (idempotent skip)'
    );
    return;
  }

  // Update purchase status
  await purchase.update({
    status: PurchaseStatus.COMPLETED,
    stripePaymentIntentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id,
    purchasedAt: new Date(),
  });

  // Send purchase confirmation notification
  onPurchaseConfirmed(purchase);

  logger.info(
    { purchaseId: purchase.id, courseId, userId },
    'Course purchase completed'
  );
}

/**
 * Handle B2B license checkout completion
 */
async function handleB2BLicenseCheckout(
  session: Stripe.Checkout.Session
): Promise<void> {
  const { tenantId, courseId } = session.metadata || {};

  if (!tenantId || !courseId) {
    logger.error(
      { sessionId: session.id },
      'B2B license checkout missing tenantId or courseId'
    );
    return;
  }

  // Find pending license by session ID
  const license = await TenantCourseLicense.findOne({
    where: { stripeCheckoutSessionId: session.id },
  });

  if (!license) {
    logger.error(
      { sessionId: session.id, tenantId, courseId },
      'License not found for checkout session'
    );
    return;
  }

  // Skip if already completed (idempotent)
  if (license.status === PurchaseStatus.COMPLETED) {
    logger.info(
      { licenseId: license.id },
      'License already completed (idempotent skip)'
    );
    return;
  }

  // Get payment intent and invoice IDs
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  const invoiceId =
    typeof session.invoice === 'string'
      ? session.invoice
      : session.invoice?.id;

  // Update license status
  await license.update({
    status: PurchaseStatus.COMPLETED,
    stripePaymentIntentId: paymentIntentId || null,
    stripeInvoiceId: invoiceId || null,
    purchasedAt: new Date(),
  });

  // Update tenant's Stripe customer ID if not set
  if (session.customer) {
    const tenant = await Tenant.findByPk(tenantId);
    if (tenant && !tenant.stripeCustomerId) {
      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;
      await tenant.update({ stripeCustomerId: customerId });
    }
  }

  logger.info(
    { licenseId: license.id, tenantId, courseId },
    'B2B course license activated'
  );
}

/**
 * Handle tenant subscription checkout completion
 */
async function handleTenantSubscriptionCheckout(
  session: Stripe.Checkout.Session
): Promise<void> {
  const { tenantId, seats } = session.metadata || {};

  if (!tenantId) {
    logger.error(
      { sessionId: session.id },
      'Subscription checkout missing tenantId'
    );
    return;
  }

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    logger.error({ tenantId }, 'Tenant not found for subscription checkout');
    return;
  }

  // Get subscription ID from session
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

  // Get customer ID
  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id;

  // Update tenant with Stripe IDs
  await tenant.update({
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    status: TenantStatus.ACTIVE,
    seatsPurchased: seats ? Number.parseInt(seats, 10) : tenant.seatsPurchased,
  });

  logger.info(
    { tenantId, subscriptionId },
    'Tenant subscription activated'
  );
}

/**
 * Handle payment failure
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const { courseId, userId, type } = paymentIntent.metadata || {};

  if (type !== 'course_purchase') {
    return;
  }

  logger.warn(
    { paymentIntentId: paymentIntent.id, courseId, userId },
    'Payment failed for course purchase'
  );

  // Find and update purchase if exists
  const purchase = await Purchase.findOne({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (purchase && purchase.status === PurchaseStatus.PENDING) {
    await purchase.update({ status: PurchaseStatus.FAILED });
  }
}

/**
 * Handle subscription updates (B2B)
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
  const { tenantId } = subscription.metadata || {};

  if (!tenantId) {
    return;
  }

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    logger.error({ tenantId }, 'Tenant not found for subscription update');
    return;
  }

  // Map Stripe status to tenant status
  let tenantStatus: TenantStatus;
  switch (subscription.status) {
    case 'active':
    case 'trialing':
      tenantStatus = TenantStatus.ACTIVE;
      break;
    case 'past_due':
    case 'unpaid':
      tenantStatus = TenantStatus.SUSPENDED;
      break;
    case 'canceled':
    case 'incomplete_expired':
      tenantStatus = TenantStatus.CANCELLED;
      break;
    default:
      tenantStatus = tenant.status;
  }

  // Get seats from first item
  const seats = subscription.items.data[0]?.quantity || tenant.seatsPurchased;

  await tenant.update({
    stripeSubscriptionId: subscription.id,
    status: tenantStatus,
    seatsPurchased: seats,
  });

  logger.info(
    { tenantId, subscriptionId: subscription.id, status: subscription.status },
    'Tenant subscription updated'
  );
}

/**
 * Handle subscription deletion (B2B)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const { tenantId } = subscription.metadata || {};

  if (!tenantId) {
    return;
  }

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    return;
  }

  await tenant.update({
    status: TenantStatus.CANCELLED,
  });

  logger.info({ tenantId }, 'Tenant subscription cancelled');
}

/**
 * Handle successful invoice payment (B2B recurring)
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  // This confirms recurring payments are successful
  // In newer Stripe API, subscription_details.metadata contains the subscription info
  const subscriptionId = invoice.parent?.subscription_details?.subscription;

  if (!subscriptionId) {
    return;
  }

  logger.info(
    { subscriptionId, invoiceId: invoice.id, amount: invoice.amount_paid },
    'Subscription invoice paid'
  );
}

/**
 * Handle failed invoice payment (B2B recurring)
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.parent?.subscription_details?.subscription;

  if (!subscriptionId) {
    return;
  }

  logger.warn(
    { subscriptionId, invoiceId: invoice.id },
    'Subscription invoice payment failed'
  );

  // Tenant status will be updated via subscription.updated event
}

/**
 * Handle charge refunded (B2C course refund via Stripe dashboard or API)
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  // Get payment intent ID from charge
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) {
    logger.warn({ chargeId: charge.id }, 'Charge refunded but no payment intent');
    return;
  }

  // Find purchase by payment intent ID
  const purchase = await Purchase.findOne({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (!purchase) {
    logger.warn(
      { paymentIntentId, chargeId: charge.id },
      'No purchase found for refunded charge'
    );
    return;
  }

  // Skip if already refunded (idempotent)
  if (purchase.status === PurchaseStatus.REFUNDED) {
    logger.info(
      { purchaseId: purchase.id, chargeId: charge.id },
      'Purchase already refunded (idempotent skip)'
    );
    return;
  }

  // Get refund details from the charge
  const refund = charge.refunds?.data[0];
  const refundId = refund?.id;
  const refundAmount = charge.amount_refunded / 100; // Convert from cents
  const isPartialRefund = charge.amount_refunded < charge.amount;

  // Update purchase status
  await purchase.update({
    status: PurchaseStatus.REFUNDED,
    stripeRefundId: refundId || null,
    refundedAt: new Date(),
    refundReason: 'Refunded via Stripe',
    refundAmount,
    isPartialRefund,
  });

  logger.info(
    {
      purchaseId: purchase.id,
      chargeId: charge.id,
      refundId,
      refundAmount,
      isPartialRefund,
    },
    'Purchase refunded via webhook'
  );
}

import type Stripe from 'stripe';

// Checkout session types
export interface CreateCheckoutSessionOptions {
  courseId: string;
  userId: string;
  courseName: string;
  courseDescription?: string;
  priceInCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  stripePriceId?: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

// B2B License checkout (course licenses for tenants)
export interface CreateB2BLicenseCheckoutOptions {
  tenantId: string;
  courseId: string;
  userId: string;
  licenseType: 'unlimited' | 'seats';
  seats: number | null;
  courseName: string;
  description: string;
  priceInCents: number;
  currency: string;
  customerEmail: string;
  stripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
}

// Subscription types (B2B)
export interface CreateSubscriptionCheckoutOptions {
  tenantId: string;
  tenantName: string;
  adminEmail: string;
  seats: number;
  planPriceId: string;
  successUrl: string;
  cancelUrl: string;
  stripeCustomerId?: string;
}

export interface CreateCustomerPortalOptions {
  stripeCustomerId: string;
  returnUrl: string;
}

export interface CustomerPortalResult {
  url: string;
}

// Product sync types
export interface SyncProductOptions {
  courseId: string;
  name: string;
  description?: string;
  priceInCents: number;
  currency: string;
  existingProductId?: string;
  existingPriceId?: string;
}

export interface SyncProductResult {
  productId: string;
  priceId: string;
}

// Webhook event types
export type StripeWebhookEvent = Stripe.Event;

export interface WebhookEventMetadata {
  courseId?: string;
  userId?: string;
  tenantId?: string;
}

// Refund types
export interface RefundOptions {
  paymentIntentId: string;
  amount?: number; // Amount in cents for partial refund, omit for full refund
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

export interface RefundResult {
  refundId: string;
  status: string;
  amount: number;
  currency: string;
  paymentIntentId: string;
  createdAt: Date;
}

// Subscription status mapping
export const SUBSCRIPTION_STATUS_MAP = {
  active: 'active',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'suspended',
  incomplete: 'pending',
  incomplete_expired: 'expired',
  trialing: 'trialing',
  paused: 'paused',
} as const;

export type SubscriptionStatus = keyof typeof SUBSCRIPTION_STATUS_MAP;

// Circuit breaker wrapped operations
export interface StripeOperations {
  createCheckoutSession(
    options: CreateCheckoutSessionOptions
  ): Promise<CheckoutSessionResult>;

  createSubscriptionCheckout(
    options: CreateSubscriptionCheckoutOptions
  ): Promise<CheckoutSessionResult>;

  createCustomerPortal(
    options: CreateCustomerPortalOptions
  ): Promise<CustomerPortalResult>;

  syncProduct(options: SyncProductOptions): Promise<SyncProductResult>;

  retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session>;

  retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;

  updateSubscriptionSeats(
    subscriptionId: string,
    seats: number
  ): Promise<Stripe.Subscription>;

  cancelSubscription(
    subscriptionId: string,
    immediately?: boolean
  ): Promise<Stripe.Subscription>;

  constructWebhookEvent(
    payload: Buffer,
    signature: string
  ): Stripe.Event;
}

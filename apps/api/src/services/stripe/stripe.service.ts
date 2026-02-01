import Stripe from 'stripe';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { createStripeCircuitBreaker } from './circuit-breaker.js';
import { createCheckoutHandler } from './handlers/checkout.handler.js';
import { createSubscriptionHandler } from './handlers/subscription.handler.js';
import { createProductHandler } from './handlers/product.handler.js';
import { createRefundHandler } from './handlers/refund.handler.js';
import type {
  CreateCheckoutSessionOptions,
  CreateB2BLicenseCheckoutOptions,
  CreateSubscriptionCheckoutOptions,
  CreateCustomerPortalOptions,
  CreateCustomerOptions,
  CreateCustomerResult,
  SyncProductOptions,
  CheckoutSessionResult,
  CustomerPortalResult,
  SyncProductResult,
  RefundOptions,
  RefundResult,
} from './stripe.types.js';

class StripeService {
  private stripe: Stripe;
  private checkoutHandler: ReturnType<typeof createCheckoutHandler>;
  private subscriptionHandler: ReturnType<typeof createSubscriptionHandler>;
  private productHandler: ReturnType<typeof createProductHandler>;
  private refundHandler: ReturnType<typeof createRefundHandler>;

  // Circuit breaker wrapped methods
  private createCheckoutSessionCB: (
    options: CreateCheckoutSessionOptions
  ) => Promise<CheckoutSessionResult>;
  private createB2BLicenseCheckoutCB: (
    options: CreateB2BLicenseCheckoutOptions
  ) => Promise<CheckoutSessionResult>;
  private createSubscriptionCheckoutCB: (
    options: CreateSubscriptionCheckoutOptions
  ) => Promise<CheckoutSessionResult>;
  private createCustomerPortalCB: (
    options: CreateCustomerPortalOptions
  ) => Promise<CustomerPortalResult>;
  private syncProductCB: (
    options: SyncProductOptions
  ) => Promise<SyncProductResult>;
  private createRefundCB: (options: RefundOptions) => Promise<RefundResult>;
  private createCustomerCB: (options: CreateCustomerOptions) => Promise<CreateCustomerResult>;

  constructor() {
    if (!config.stripeSecretKey) {
      logger.warn('Stripe secret key not configured - payments will fail');
    }

    this.stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });

    // Initialize handlers
    this.checkoutHandler = createCheckoutHandler(this.stripe);
    this.subscriptionHandler = createSubscriptionHandler(this.stripe);
    this.productHandler = createProductHandler(this.stripe);
    this.refundHandler = createRefundHandler(this.stripe);

    // Wrap with circuit breakers
    this.createCheckoutSessionCB = createStripeCircuitBreaker(
      (opts: CreateCheckoutSessionOptions) =>
        this.checkoutHandler.createCourseCheckoutSession(opts),
      'createCheckoutSession'
    );

    this.createB2BLicenseCheckoutCB = createStripeCircuitBreaker(
      (opts: CreateB2BLicenseCheckoutOptions) =>
        this.checkoutHandler.createB2BLicenseCheckoutSession(opts),
      'createB2BLicenseCheckout'
    );

    this.createSubscriptionCheckoutCB = createStripeCircuitBreaker(
      (opts: CreateSubscriptionCheckoutOptions) =>
        this.subscriptionHandler.createSubscriptionCheckout(opts),
      'createSubscriptionCheckout'
    );

    this.createCustomerPortalCB = createStripeCircuitBreaker(
      (opts: CreateCustomerPortalOptions) =>
        this.subscriptionHandler.createCustomerPortal(opts),
      'createCustomerPortal'
    );

    this.syncProductCB = createStripeCircuitBreaker(
      (opts: SyncProductOptions) => this.productHandler.syncProduct(opts),
      'syncProduct'
    );

    this.createRefundCB = createStripeCircuitBreaker(
      (opts: RefundOptions) => this.refundHandler.createRefund(opts),
      'createRefund'
    );

    this.createCustomerCB = createStripeCircuitBreaker(
      async (opts: CreateCustomerOptions): Promise<CreateCustomerResult> => {
        const customer = await this.stripe.customers.create({
          email: opts.email,
          name: opts.name,
          metadata: opts.metadata,
        });
        return { customerId: customer.id, email: opts.email };
      },
      'createCustomer'
    );

    logger.info('Stripe service initialized');
  }

  // Checkout (B2C course purchases)
  async createCourseCheckoutSession(
    options: CreateCheckoutSessionOptions
  ): Promise<CheckoutSessionResult> {
    return this.createCheckoutSessionCB(options);
  }

  async retrieveCheckoutSession(
    sessionId: string
  ): Promise<Stripe.Checkout.Session> {
    return this.checkoutHandler.retrieveSession(sessionId);
  }

  // B2B License checkout (course licenses for tenants - card + bank transfer)
  async createB2BLicenseCheckoutSession(
    options: CreateB2BLicenseCheckoutOptions
  ): Promise<CheckoutSessionResult> {
    return this.createB2BLicenseCheckoutCB(options);
  }

  // Subscriptions (B2B tenant billing)
  async createSubscriptionCheckout(
    options: CreateSubscriptionCheckoutOptions
  ): Promise<CheckoutSessionResult> {
    return this.createSubscriptionCheckoutCB(options);
  }

  async createCustomerPortal(
    options: CreateCustomerPortalOptions
  ): Promise<CustomerPortalResult> {
    return this.createCustomerPortalCB(options);
  }

  async retrieveSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    return this.subscriptionHandler.retrieveSubscription(subscriptionId);
  }

  async updateSubscriptionSeats(
    subscriptionId: string,
    seats: number
  ): Promise<Stripe.Subscription> {
    return this.subscriptionHandler.updateSubscriptionSeats(
      subscriptionId,
      seats
    );
  }

  async cancelSubscription(
    subscriptionId: string,
    immediately = false
  ): Promise<Stripe.Subscription> {
    return this.subscriptionHandler.cancelSubscription(
      subscriptionId,
      immediately
    );
  }

  async reactivateSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    return this.subscriptionHandler.reactivateSubscription(subscriptionId);
  }

  // Products (sync courses to Stripe)
  async syncProduct(options: SyncProductOptions): Promise<SyncProductResult> {
    return this.syncProductCB(options);
  }

  async archiveProduct(productId: string): Promise<void> {
    return this.productHandler.archiveProduct(productId);
  }

  // Refunds
  async createRefund(options: RefundOptions): Promise<RefundResult> {
    return this.createRefundCB(options);
  }

  async retrieveRefund(refundId: string): Promise<Stripe.Refund> {
    return this.refundHandler.retrieveRefund(refundId);
  }

  async listRefundsForPaymentIntent(
    paymentIntentId: string
  ): Promise<Stripe.Refund[]> {
    return this.refundHandler.listRefundsForPaymentIntent(paymentIntentId);
  }

  // Customer management
  async createCustomer(options: CreateCustomerOptions): Promise<CreateCustomerResult> {
    return this.createCustomerCB(options);
  }

  // Webhook signature verification (not wrapped in circuit breaker - sync operation)
  constructWebhookEvent(
    payload: Buffer,
    signature: string
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripeWebhookSecret
    );
  }

  // Expose Stripe instance for advanced operations if needed
  get client(): Stripe {
    return this.stripe;
  }
}

// Singleton instance
export const stripeService = new StripeService();

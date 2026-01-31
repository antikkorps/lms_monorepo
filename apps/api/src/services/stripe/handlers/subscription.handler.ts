import type Stripe from 'stripe';
import type {
  CreateSubscriptionCheckoutOptions,
  CreateCustomerPortalOptions,
  CheckoutSessionResult,
  CustomerPortalResult,
} from '../stripe.types.js';

export function createSubscriptionHandler(stripe: Stripe) {
  return {
    async createSubscriptionCheckout(
      options: CreateSubscriptionCheckoutOptions
    ): Promise<CheckoutSessionResult> {
      const {
        tenantId,
        tenantName,
        adminEmail,
        seats,
        planPriceId,
        successUrl,
        cancelUrl,
        stripeCustomerId,
      } = options;

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: planPriceId,
            quantity: seats,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          type: 'tenant_subscription',
          tenantId,
          tenantName,
          seats: seats.toString(),
        },
        subscription_data: {
          metadata: {
            type: 'tenant_subscription',
            tenantId,
            tenantName,
            seats: seats.toString(),
          },
        },
      };

      // Use existing customer or create via checkout
      if (stripeCustomerId) {
        sessionParams.customer = stripeCustomerId;
      } else {
        sessionParams.customer_email = adminEmail;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      if (!session.url) {
        throw new Error('Stripe did not return a checkout URL');
      }

      return {
        sessionId: session.id,
        url: session.url,
      };
    },

    async createCustomerPortal(
      options: CreateCustomerPortalOptions
    ): Promise<CustomerPortalResult> {
      const { stripeCustomerId, returnUrl } = options;

      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl,
      });

      return {
        url: session.url,
      };
    },

    async retrieveSubscription(
      subscriptionId: string
    ): Promise<Stripe.Subscription> {
      return stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method', 'latest_invoice'],
      });
    },

    async updateSubscriptionSeats(
      subscriptionId: string,
      seats: number
    ): Promise<Stripe.Subscription> {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (!subscription.items.data[0]) {
        throw new Error('Subscription has no items');
      }

      return stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            quantity: seats,
          },
        ],
        metadata: {
          seats: seats.toString(),
        },
        proration_behavior: 'create_prorations',
      });
    },

    async cancelSubscription(
      subscriptionId: string,
      immediately = false
    ): Promise<Stripe.Subscription> {
      if (immediately) {
        return stripe.subscriptions.cancel(subscriptionId);
      }

      return stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    },

    async reactivateSubscription(
      subscriptionId: string
    ): Promise<Stripe.Subscription> {
      return stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
    },
  };
}

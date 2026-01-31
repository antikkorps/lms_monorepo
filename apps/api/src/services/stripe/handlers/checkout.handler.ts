import type Stripe from 'stripe';
import type {
  CreateCheckoutSessionOptions,
  CheckoutSessionResult,
} from '../stripe.types.js';

export function createCheckoutHandler(stripe: Stripe) {
  return {
    async createCourseCheckoutSession(
      options: CreateCheckoutSessionOptions
    ): Promise<CheckoutSessionResult> {
      const {
        courseId,
        userId,
        courseName,
        courseDescription,
        priceInCents,
        currency,
        successUrl,
        cancelUrl,
        customerEmail,
        stripePriceId,
      } = options;

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

      if (stripePriceId) {
        // Use existing Stripe price
        lineItems.push({
          price: stripePriceId,
          quantity: 1,
        });
      } else {
        // Create inline price data
        lineItems.push({
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: courseName,
              description: courseDescription || undefined,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        });
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          type: 'course_purchase',
          courseId,
          userId,
        },
        payment_intent_data: {
          metadata: {
            type: 'course_purchase',
            courseId,
            userId,
          },
        },
      };

      if (customerEmail) {
        sessionParams.customer_email = customerEmail;
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

    async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
      return stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'line_items'],
      });
    },
  };
}

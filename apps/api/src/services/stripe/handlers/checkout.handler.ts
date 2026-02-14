import type Stripe from 'stripe';
import type {
  CreateCheckoutSessionOptions,
  CreateB2BLicenseCheckoutOptions,
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

    /**
     * Create a B2B license checkout session
     * Supports both card and bank transfer (SEPA/ACH) payment methods
     */
    async createB2BLicenseCheckoutSession(
      options: CreateB2BLicenseCheckoutOptions
    ): Promise<CheckoutSessionResult> {
      const {
        tenantId,
        courseId,
        userId,
        licenseType,
        seats,
        courseName,
        description,
        priceInCents,
        currency,
        customerEmail,
        stripeCustomerId,
        successUrl,
        cancelUrl,
        renewalLicenseId,
      } = options;

      // Build session params with B2B payment options
      // Bank transfer (customer_balance) requires an existing Stripe customer
      const paymentMethods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ['card'];

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        payment_method_types: paymentMethods,
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: courseName,
                description,
              },
              unit_amount: priceInCents,
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: stripeCustomerId ? undefined : customerEmail,
        customer: stripeCustomerId || undefined,
        metadata: {
          type: renewalLicenseId ? 'b2b_license_renewal' : 'b2b_license',
          tenantId,
          courseId,
          userId,
          licenseType,
          seats: seats?.toString() || 'unlimited',
          ...(renewalLicenseId ? { renewalLicenseId } : {}),
        },
        payment_intent_data: {
          metadata: {
            type: renewalLicenseId ? 'b2b_license_renewal' : 'b2b_license',
            tenantId,
            courseId,
            userId,
            licenseType,
            seats: seats?.toString() || 'unlimited',
            ...(renewalLicenseId ? { renewalLicenseId } : {}),
          },
        },
        // Allow invoice for bank transfer tracking
        invoice_creation: {
          enabled: true,
          invoice_data: {
            description: `Course License: ${courseName}`,
            metadata: {
              type: 'b2b_license',
              tenantId,
              courseId,
            },
          },
        },
      };

      // Add bank transfer (customer_balance) only if we have a Stripe customer
      // This is required because customer_balance needs an existing customer
      if (stripeCustomerId) {
        paymentMethods.push('customer_balance');
        sessionParams.payment_method_options = {
          customer_balance: {
            funding_type: 'bank_transfer',
            bank_transfer: {
              type: 'eu_bank_transfer',
              eu_bank_transfer: {
                country: 'FR',
              },
            },
          },
        };
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
  };
}

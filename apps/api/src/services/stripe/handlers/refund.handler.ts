import type Stripe from 'stripe';
import type { RefundOptions, RefundResult } from '../stripe.types.js';

export function createRefundHandler(stripe: Stripe) {
  return {
    /**
     * Create a refund for a payment intent
     */
    async createRefund(options: RefundOptions): Promise<RefundResult> {
      const { paymentIntentId, amount, reason, metadata } = options;

      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason: reason || 'requested_by_customer',
      };

      // If amount is provided, it's a partial refund
      if (amount !== undefined) {
        refundParams.amount = amount;
      }

      if (metadata) {
        refundParams.metadata = metadata;
      }

      const refund = await stripe.refunds.create(refundParams);

      return {
        refundId: refund.id,
        status: refund.status || 'succeeded',
        amount: refund.amount,
        currency: refund.currency,
        paymentIntentId:
          typeof refund.payment_intent === 'string'
            ? refund.payment_intent
            : refund.payment_intent?.id || paymentIntentId,
        createdAt: new Date(refund.created * 1000),
      };
    },

    /**
     * Retrieve a refund by ID
     */
    async retrieveRefund(refundId: string): Promise<Stripe.Refund> {
      return stripe.refunds.retrieve(refundId);
    },

    /**
     * List refunds for a payment intent
     */
    async listRefundsForPaymentIntent(
      paymentIntentId: string
    ): Promise<Stripe.Refund[]> {
      const refunds = await stripe.refunds.list({
        payment_intent: paymentIntentId,
      });
      return refunds.data;
    },
  };
}

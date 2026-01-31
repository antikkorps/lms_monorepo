import type Stripe from 'stripe';
import type { SyncProductOptions, SyncProductResult } from '../stripe.types.js';

export function createProductHandler(stripe: Stripe) {
  return {
    async syncProduct(options: SyncProductOptions): Promise<SyncProductResult> {
      const {
        courseId,
        name,
        description,
        priceInCents,
        currency,
        existingProductId,
        existingPriceId,
      } = options;

      let productId: string;

      if (existingProductId) {
        // Update existing product
        await stripe.products.update(existingProductId, {
          name,
          description: description || undefined,
        });
        productId = existingProductId;
      } else {
        // Create new product
        const product = await stripe.products.create({
          name,
          description: description || undefined,
          metadata: {
            courseId,
            type: 'course',
          },
        });
        productId = product.id;
      }

      // Check if price needs update (Stripe prices are immutable, so we archive and create new)
      let priceId: string;

      if (existingPriceId) {
        const existingPrice = await stripe.prices.retrieve(existingPriceId);

        // If price changed, archive old and create new
        if (
          existingPrice.unit_amount !== priceInCents ||
          existingPrice.currency !== currency.toLowerCase()
        ) {
          // Archive old price
          await stripe.prices.update(existingPriceId, { active: false });

          // Create new price
          const newPrice = await stripe.prices.create({
            product: productId,
            unit_amount: priceInCents,
            currency: currency.toLowerCase(),
            metadata: {
              courseId,
            },
          });
          priceId = newPrice.id;
        } else {
          priceId = existingPriceId;
        }
      } else {
        // Create new price
        const price = await stripe.prices.create({
          product: productId,
          unit_amount: priceInCents,
          currency: currency.toLowerCase(),
          metadata: {
            courseId,
          },
        });
        priceId = price.id;
      }

      return {
        productId,
        priceId,
      };
    },

    async archiveProduct(productId: string): Promise<void> {
      await stripe.products.update(productId, {
        active: false,
      });
    },

    async listProductPrices(productId: string): Promise<Stripe.Price[]> {
      const prices = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 10,
      });
      return prices.data;
    },
  };
}

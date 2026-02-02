/**
 * Invoice Service
 * Exports the active invoice provider based on configuration
 * To switch providers, change the implementation here
 */

import type { InvoiceProvider } from './invoice.provider.js';
import { StripeInvoiceProvider } from './stripe-invoice.provider.js';

export type { InvoiceProvider } from './invoice.provider.js';
export { StripeInvoiceProvider } from './stripe-invoice.provider.js';

// Active provider instance (singleton)
// Change this line to switch payment providers
const invoiceProvider: InvoiceProvider = new StripeInvoiceProvider();

export { invoiceProvider };

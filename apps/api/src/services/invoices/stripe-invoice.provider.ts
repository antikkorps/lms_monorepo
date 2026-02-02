/**
 * Stripe Invoice Provider
 * Implements InvoiceProvider interface for Stripe
 */

import Stripe from 'stripe';
import type {
  Invoice,
  InvoiceListItem,
  InvoiceListOptions,
  InvoiceListResult,
  InvoiceStatus,
  InvoiceLineItem,
} from '@shared/types';
import type { InvoiceProvider } from './invoice.provider.js';
import { createStripeCircuitBreaker } from '../stripe/circuit-breaker.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/app-error.js';

/**
 * Map Stripe invoice status to our generic status
 */
function mapStripeStatus(status: Stripe.Invoice.Status | null): InvoiceStatus {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'open':
      return 'open';
    case 'paid':
      return 'paid';
    case 'uncollectible':
      return 'uncollectible';
    case 'void':
      return 'void';
    default:
      return 'draft';
  }
}

/**
 * Map Stripe line item to our generic line item
 */
function mapLineItem(item: Stripe.InvoiceLineItem): InvoiceLineItem {
  const quantity = item.quantity || 1;
  // Calculate unit amount from total amount divided by quantity
  const unitAmount = Math.round(item.amount / quantity);

  return {
    id: item.id,
    description: item.description || 'Item',
    quantity,
    unitAmount,
    amount: item.amount,
    currency: item.currency.toUpperCase(),
  };
}

/**
 * Map Stripe invoice to our generic Invoice type
 */
function mapInvoice(invoice: Stripe.Invoice): Invoice {
  const lines = invoice.lines?.data || [];

  return {
    id: invoice.id,
    number: invoice.number,
    status: mapStripeStatus(invoice.status),
    currency: invoice.currency.toUpperCase(),
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    amountRemaining: invoice.amount_remaining,
    subtotal: invoice.subtotal,
    total: invoice.total,
    tax: null, // Tax details available via line items if needed
    createdAt: new Date(invoice.created * 1000),
    dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
    paidAt: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : null,
    periodStart: invoice.period_start
      ? new Date(invoice.period_start * 1000)
      : null,
    periodEnd: invoice.period_end
      ? new Date(invoice.period_end * 1000)
      : null,
    description: invoice.description ?? null,
    hostedUrl: invoice.hosted_invoice_url ?? null,
    pdfUrl: invoice.invoice_pdf ?? null,
    lines: lines.map(mapLineItem),
    metadata: (invoice.metadata || {}) as Record<string, string>,
  };
}

/**
 * Map Stripe invoice to list item (lighter version)
 */
function mapInvoiceListItem(invoice: Stripe.Invoice): InvoiceListItem {
  return {
    id: invoice.id,
    number: invoice.number,
    status: mapStripeStatus(invoice.status),
    currency: invoice.currency.toUpperCase(),
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    total: invoice.total,
    createdAt: new Date(invoice.created * 1000),
    dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
    paidAt: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : null,
    description: invoice.description ?? null,
    hostedUrl: invoice.hosted_invoice_url ?? null,
  };
}

export class StripeInvoiceProvider implements InvoiceProvider {
  private stripe: Stripe;
  private listInvoicesCB: (
    customerId: string,
    options?: InvoiceListOptions
  ) => Promise<InvoiceListResult>;
  private getInvoiceCB: (invoiceId: string) => Promise<Invoice>;

  constructor() {
    if (!config.stripeSecretKey) {
      logger.warn('Stripe secret key not configured - invoice operations will fail');
    }

    this.stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });

    // Wrap operations with circuit breaker
    this.listInvoicesCB = createStripeCircuitBreaker(
      this.listInvoicesInternal.bind(this),
      'listInvoices'
    );

    this.getInvoiceCB = createStripeCircuitBreaker(
      this.getInvoiceInternal.bind(this),
      'getInvoice'
    );

    logger.info('Stripe invoice provider initialized');
  }

  private async listInvoicesInternal(
    customerId: string,
    options: InvoiceListOptions = {}
  ): Promise<InvoiceListResult> {
    const { limit = 20, status, startDate, endDate } = options;

    const params: Stripe.InvoiceListParams = {
      customer: customerId,
      limit: Math.min(limit, 100), // Stripe max is 100
    };

    if (status) {
      params.status = status;
    }

    if (startDate || endDate) {
      const created: Stripe.RangeQueryParam = {};
      if (startDate) {
        created.gte = Math.floor(startDate.getTime() / 1000);
      }
      if (endDate) {
        created.lte = Math.floor(endDate.getTime() / 1000);
      }
      params.created = created;
    }

    const response = await this.stripe.invoices.list(params);

    return {
      invoices: response.data.map(mapInvoiceListItem),
      total: response.data.length,
      hasMore: response.has_more,
    };
  }

  async listInvoices(
    customerId: string,
    options?: InvoiceListOptions
  ): Promise<InvoiceListResult> {
    return this.listInvoicesCB(customerId, options);
  }

  private async getInvoiceInternal(invoiceId: string): Promise<Invoice> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId, {
        expand: ['lines'],
      });
      return mapInvoice(invoice);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeInvalidRequestError) {
        throw AppError.notFound('Invoice not found');
      }
      throw error;
    }
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    return this.getInvoiceCB(invoiceId);
  }

  async getInvoicePdfUrl(invoiceId: string): Promise<string | null> {
    const invoice = await this.getInvoice(invoiceId);
    return invoice.pdfUrl || invoice.hostedUrl;
  }

  async verifyInvoiceOwnership(
    invoiceId: string,
    customerId: string
  ): Promise<boolean> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      return invoice.customer === customerId;
    } catch {
      return false;
    }
  }
}

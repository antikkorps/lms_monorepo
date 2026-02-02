/**
 * Invoice Provider Interface
 * Abstract interface for invoice operations - allows swapping payment providers
 */

import type {
  Invoice,
  InvoiceListItem,
  InvoiceListOptions,
  InvoiceListResult,
} from '@shared/types';

export interface InvoiceProvider {
  /**
   * List invoices for a customer
   */
  listInvoices(
    customerId: string,
    options?: InvoiceListOptions
  ): Promise<InvoiceListResult>;

  /**
   * Get a single invoice by ID
   * @throws NotFoundError if invoice doesn't exist
   */
  getInvoice(invoiceId: string): Promise<Invoice>;

  /**
   * Get the PDF URL for an invoice
   * Returns a URL that can be used to download the invoice PDF
   */
  getInvoicePdfUrl(invoiceId: string): Promise<string | null>;

  /**
   * Verify that an invoice belongs to a specific customer
   * Used for authorization checks
   */
  verifyInvoiceOwnership(invoiceId: string, customerId: string): Promise<boolean>;
}

/**
 * Provider types supported by the system
 */
export type InvoiceProviderType = 'stripe' | 'mock';

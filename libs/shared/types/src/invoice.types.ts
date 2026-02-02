/**
 * Invoice types - Provider agnostic
 * These types are independent of any payment provider (Stripe, Paddle, etc.)
 */

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  currency: string;
}

export interface Invoice {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  currency: string;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  subtotal: number;
  total: number;
  tax: number | null;
  createdAt: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  description: string | null;
  hostedUrl: string | null;
  pdfUrl: string | null;
  lines: InvoiceLineItem[];
  metadata: Record<string, string>;
}

export interface InvoiceListItem {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  currency: string;
  amountDue: number;
  amountPaid: number;
  total: number;
  createdAt: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  description: string | null;
  hostedUrl: string | null;
}

export interface InvoiceListOptions {
  limit?: number;
  offset?: number;
  status?: InvoiceStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface InvoiceListResult {
  invoices: InvoiceListItem[];
  total: number;
  hasMore: boolean;
}

/**
 * Tenant Invoices Composable
 * Handles tenant invoice listing and PDF download
 */

import { ref, computed } from 'vue';
import { useApi } from './useApi';
import type { InvoiceListItem, Invoice, InvoiceStatus } from '@shared/types';

export interface InvoicesFilter {
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
}

export function useTenantInvoices() {
  const api = useApi();

  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const invoices = ref<InvoiceListItem[]>([]);
  const selectedInvoice = ref<Invoice | null>(null);
  const hasMore = ref(false);
  const total = ref(0);

  // Computed helpers
  const hasInvoices = computed(() => invoices.value.length > 0);

  const paidInvoices = computed(() =>
    invoices.value.filter((i) => i.status === 'paid')
  );

  const openInvoices = computed(() =>
    invoices.value.filter((i) => i.status === 'open')
  );

  const totalPaid = computed(() =>
    paidInvoices.value.reduce((sum, i) => sum + i.amountPaid, 0)
  );

  /**
   * Format amount in cents to currency string
   */
  function formatAmount(amountInCents: number, currency: string): string {
    const amount = amountInCents / 100;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  /**
   * Format date for display
   */
  function formatDate(date: Date | string | null): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Get status badge color
   */
  function getStatusColor(status: InvoiceStatus): string {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'open':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'uncollectible':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'void':
        return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }

  /**
   * Fetch invoices list
   */
  async function fetchInvoices(
    filter?: InvoicesFilter,
    limit = 20
  ): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));

      if (filter?.status) {
        params.set('status', filter.status);
      }
      if (filter?.startDate) {
        params.set('startDate', filter.startDate);
      }
      if (filter?.endDate) {
        params.set('endDate', filter.endDate);
      }

      interface ApiInvoiceListItem {
        id: string;
        number: string | null;
        status: InvoiceStatus;
        currency: string;
        amountDue: number;
        amountPaid: number;
        total: number;
        createdAt: string;
        dueDate: string | null;
        paidAt: string | null;
        description: string | null;
        hostedUrl: string | null;
      }

      interface ApiResponse {
        invoices: ApiInvoiceListItem[];
        pagination: {
          total: number;
          hasMore: boolean;
        };
      }

      const data = await api.get<ApiResponse>(`/tenant/invoices?${params.toString()}`);

      invoices.value = data.invoices.map((i) => ({
        ...i,
        createdAt: new Date(i.createdAt),
        dueDate: i.dueDate ? new Date(i.dueDate) : null,
        paidAt: i.paidAt ? new Date(i.paidAt) : null,
      }));
      total.value = data.pagination.total;
      hasMore.value = data.pagination.hasMore;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load invoices';
      invoices.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Fetch single invoice details
   */
  async function fetchInvoice(invoiceId: string): Promise<Invoice | null> {
    isLoading.value = true;
    error.value = null;

    try {
      interface ApiInvoice {
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
        createdAt: string;
        dueDate: string | null;
        paidAt: string | null;
        periodStart: string | null;
        periodEnd: string | null;
        description: string | null;
        hostedUrl: string | null;
        pdfUrl: string | null;
        lines: Array<{
          id: string;
          description: string;
          quantity: number;
          unitAmount: number;
          amount: number;
          currency: string;
        }>;
        metadata: Record<string, string>;
      }

      const data = await api.get<ApiInvoice>(`/tenant/invoices/${invoiceId}`);

      const invoice: Invoice = {
        ...data,
        createdAt: new Date(data.createdAt),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        paidAt: data.paidAt ? new Date(data.paidAt) : null,
        periodStart: data.periodStart ? new Date(data.periodStart) : null,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
      };

      selectedInvoice.value = invoice;
      return invoice;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load invoice';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Get PDF download URL for an invoice
   */
  async function getInvoicePdfUrl(invoiceId: string): Promise<string | null> {
    try {
      interface PdfResponse {
        url: string;
      }
      const data = await api.get<PdfResponse>(`/tenant/invoices/${invoiceId}/pdf`);
      return data.url;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get PDF URL';
      return null;
    }
  }

  /**
   * Download invoice PDF (opens in new tab)
   */
  async function downloadInvoicePdf(invoiceId: string): Promise<void> {
    const url = await getInvoicePdfUrl(invoiceId);
    if (url) {
      window.open(url, '_blank');
    }
  }

  /**
   * Refresh invoices list
   */
  async function refresh(filter?: InvoicesFilter): Promise<void> {
    await fetchInvoices(filter);
  }

  /**
   * Clear selected invoice
   */
  function clearSelectedInvoice(): void {
    selectedInvoice.value = null;
  }

  return {
    // State
    isLoading,
    error,
    invoices,
    selectedInvoice,
    hasMore,
    total,

    // Computed
    hasInvoices,
    paidInvoices,
    openInvoices,
    totalPaid,

    // Methods
    fetchInvoices,
    fetchInvoice,
    getInvoicePdfUrl,
    downloadInvoicePdf,
    refresh,
    clearSelectedInvoice,

    // Formatters
    formatAmount,
    formatDate,
    getStatusColor,
  };
}

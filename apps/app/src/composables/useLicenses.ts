import { ref } from 'vue';
import { useApi } from './useApi';

export interface License {
  id: string;
  courseId: string;
  licenseType: 'unlimited' | 'seats';
  seatsTotal: number | null;
  seatsUsed: number;
  availableSeats: number | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'expired' | 'refunded' | 'failed';
  purchasedAt: string;
  expiresAt: string | null;
  renewedAt: string | null;
  renewalCount: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl: string | null;
    description?: string;
  } | null;
  purchasedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  assignments?: LicenseAssignment[];
}

export interface LicenseAssignment {
  id: string;
  userId: string;
  assignedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface PricingPreview {
  coursePrice: number;
  licenseType: string;
  seats: number | null;
  pricePerSeat: number;
  totalPrice: number;
  discountPercent: number;
  savings: number;
  tiers: DiscountTier[];
  currency: string;
  courseTitle: string;
}

export interface DiscountTier {
  minSeats: number;
  discountPercent: number;
}

export interface LicenseCheckoutResult {
  sessionId: string;
  url: string;
  amount: number;
  currency: string;
}

export interface LicenseListResponse {
  licenses: License[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useLicenses() {
  const api = useApi();
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchLicenses(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<LicenseListResponse> {
    loading.value = true;
    error.value = null;
    try {
      return await api.get<LicenseListResponse>('/tenant/licenses', params);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load licenses';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchLicense(id: string): Promise<License> {
    loading.value = true;
    error.value = null;
    try {
      return await api.get<License>(`/tenant/licenses/${id}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load license';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function previewPricing(params: {
    courseId: string;
    licenseType: string;
    seats?: number;
  }): Promise<PricingPreview> {
    return await api.get<PricingPreview>('/tenant/licenses/pricing', params);
  }

  async function createCheckout(data: {
    courseId: string;
    licenseType: 'unlimited' | 'seats';
    seats?: number;
  }): Promise<LicenseCheckoutResult> {
    return await api.post<LicenseCheckoutResult>('/tenant/licenses/checkout', data);
  }

  async function assignSeat(licenseId: string, userId: string): Promise<void> {
    await api.post(`/tenant/licenses/${licenseId}/assign`, { userId });
  }

  async function unassignSeat(licenseId: string, userId: string): Promise<void> {
    await api.delete(`/tenant/licenses/${licenseId}/assignments/${userId}`);
  }

  async function renewLicense(licenseId: string): Promise<LicenseCheckoutResult> {
    return await api.post<LicenseCheckoutResult>(`/tenant/licenses/${licenseId}/renew`);
  }

  async function requestRefund(licenseId: string, reason?: string): Promise<void> {
    await api.post(`/tenant/licenses/${licenseId}/refund`, { reason });
  }

  function formatAmount(amount: number, currency = 'EUR'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'refunded':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400';
    }
  }

  return {
    loading,
    error,
    fetchLicenses,
    fetchLicense,
    previewPricing,
    createCheckout,
    assignSeat,
    unassignSeat,
    renewLicense,
    requestRefund,
    formatAmount,
    getStatusColor,
  };
}

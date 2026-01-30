/**
 * Payments Composable
 * Handles Stripe checkout for course purchases
 */

import { ref } from 'vue';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { useApi, ApiRequestError } from './useApi';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;

// Singleton Stripe instance
let stripePromise: Promise<Stripe | null> | null = null;

function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!STRIPE_PUBLISHABLE_KEY) {
      console.error('[usePayments] Stripe publishable key not configured');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}

interface CheckoutResponse {
  sessionId: string;
  url: string;
}

interface PurchaseVerification {
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  course: {
    id: string;
    title: string;
    slug: string;
  } | null;
  completedAt: string | null;
}

interface Purchase {
  id: string;
  courseId: string;
  amount: string;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  purchasedAt: string | null;
  createdAt: string;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl: string | null;
  } | null;
}

interface PaginatedPurchases {
  data: Purchase[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function usePayments() {
  const api = useApi();

  const isProcessing = ref(false);
  const error = ref<string | null>(null);

  /**
   * Initiate checkout for a course purchase
   * Redirects user to Stripe Checkout
   */
  async function purchaseCourse(courseId: string): Promise<boolean> {
    isProcessing.value = true;
    error.value = null;

    try {
      // Get Stripe instance
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe is not configured');
      }

      // Create checkout session
      const response = await api.post<CheckoutResponse>('/payments/checkout/course', {
        courseId,
      });

      // Redirect to Stripe Checkout using the URL directly
      window.location.href = response.url;

      return true;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === 'ALREADY_PURCHASED') {
          error.value = 'You have already purchased this course';
        } else {
          error.value = err.message;
        }
      } else {
        error.value = err instanceof Error ? err.message : 'Payment failed';
      }
      return false;
    } finally {
      isProcessing.value = false;
    }
  }

  /**
   * Verify a purchase after returning from Stripe Checkout
   */
  async function verifyPurchase(sessionId: string): Promise<PurchaseVerification | null> {
    isProcessing.value = true;
    error.value = null;

    try {
      const response = await api.post<PurchaseVerification>('/payments/verify', {
        sessionId,
      });

      return response;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Verification failed';
      return null;
    } finally {
      isProcessing.value = false;
    }
  }

  /**
   * Get user's purchase history
   */
  async function getPurchases(
    page = 1,
    limit = 20,
    status?: string
  ): Promise<PaginatedPurchases | null> {
    try {
      const params: Record<string, string | number> = { page, limit };
      if (status) {
        params.status = status;
      }

      const response = await api.get<PaginatedPurchases>('/payments/purchases', params);
      return response;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load purchases';
      return null;
    }
  }

  /**
   * Get a single purchase by ID
   */
  async function getPurchase(purchaseId: string): Promise<Purchase | null> {
    try {
      const response = await api.get<Purchase>(`/payments/purchases/${purchaseId}`);
      return response;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load purchase';
      return null;
    }
  }

  /**
   * Check if Stripe is properly configured
   */
  async function isStripeConfigured(): Promise<boolean> {
    const stripe = await getStripe();
    return stripe !== null;
  }

  return {
    // State
    isProcessing,
    error,

    // Methods
    purchaseCourse,
    verifyPurchase,
    getPurchases,
    getPurchase,
    isStripeConfigured,
  };
}

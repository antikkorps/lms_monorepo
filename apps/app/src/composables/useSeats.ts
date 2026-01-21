/**
 * Seats Composable
 * Handles seat management for tenant admins
 */

import type { SeatOverview, SeatAllocation, SeatUsageHistory, SeatPlan } from '@shared/types';
import { ref, computed } from 'vue';
// import { useApi } from './useApi'; // TODO: Uncomment when API endpoints are ready

// Mock data for development
const mockOverview: SeatOverview = {
  seatsPurchased: 50,
  seatsUsed: 45,
  seatsAvailable: 5,
  pendingInvitations: 3,
  usagePercentage: 90,
};

const mockAllocations: SeatAllocation[] = [
  { role: 'learner', count: 38, percentage: 84.4 },
  { role: 'manager', count: 4, percentage: 8.9 },
  { role: 'instructor', count: 2, percentage: 4.4 },
  { role: 'tenant_admin', count: 1, percentage: 2.2 },
];

const mockUsageHistory: SeatUsageHistory[] = generateUsageHistory();

const mockPlans: SeatPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    seats: 25,
    pricePerSeat: 12,
    features: ['Basic analytics', 'Email support', '5 courses'],
    isCurrent: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    seats: 50,
    pricePerSeat: 10,
    features: ['Advanced analytics', 'Priority support', 'Unlimited courses', 'Custom branding'],
    isCurrent: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    seats: 100,
    pricePerSeat: 8,
    features: [
      'Full analytics suite',
      'Dedicated support',
      'Unlimited courses',
      'Custom branding',
      'SSO/SAML',
      'API access',
    ],
    isCurrent: false,
    isRecommended: true,
  },
];

function generateUsageHistory(): SeatUsageHistory[] {
  const history: SeatUsageHistory[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);

    const baseUsed = 30 + Math.floor(i * 1.3);
    const used = Math.min(baseUsed + Math.floor(Math.random() * 5), 50);

    history.push({
      date: date.toISOString().slice(0, 7), // YYYY-MM format
      used,
      purchased: 50,
    });
  }

  return history;
}

export function useSeats() {
  // const api = useApi(); // TODO: Uncomment when API endpoints are ready

  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const overview = ref<SeatOverview | null>(null);
  const allocations = ref<SeatAllocation[]>([]);
  const usageHistory = ref<SeatUsageHistory[]>([]);
  const plans = ref<SeatPlan[]>([]);

  // Computed helpers
  const isNearCapacity = computed(() => {
    if (!overview.value) return false;
    return overview.value.usagePercentage >= 80;
  });

  const isAtCapacity = computed(() => {
    if (!overview.value) return false;
    return overview.value.seatsAvailable === 0;
  });

  const effectiveSeatsAvailable = computed(() => {
    if (!overview.value) return 0;
    return overview.value.seatsAvailable - overview.value.pendingInvitations;
  });

  const currentPlan = computed(() => plans.value.find((p) => p.isCurrent));

  const upgradePlans = computed(() => plans.value.filter((p) => !p.isCurrent));

  /**
   * Get usage status color
   */
  function getUsageStatusColor(): string {
    if (!overview.value) return 'bg-gray-500';
    const percentage = overview.value.usagePercentage;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  /**
   * Get usage status text
   */
  function getUsageStatusText(): string {
    if (!overview.value) return 'Unknown';
    const percentage = overview.value.usagePercentage;
    if (percentage >= 90) return 'Critical';
    if (percentage >= 75) return 'Warning';
    return 'Healthy';
  }

  /**
   * Format role name
   */
  function formatRole(role: string): string {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get role color for charts
   */
  function getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      learner: 'hsl(var(--chart-1))',
      instructor: 'hsl(var(--chart-2))',
      manager: 'hsl(var(--chart-3))',
      tenant_admin: 'hsl(var(--chart-4))',
    };
    return colors[role] || 'hsl(var(--chart-5))';
  }

  /**
   * Fetch seat data from API
   */
  async function fetchSeats(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      // TODO: Replace with real API calls when endpoints are ready
      // const [overviewData, allocationsData, historyData, plansData] = await Promise.all([
      //   api.get<SeatOverview>('/tenant/seats'),
      //   api.get<SeatAllocation[]>('/tenant/seats/allocations'),
      //   api.get<SeatUsageHistory[]>('/tenant/seats/history'),
      //   api.get<SeatPlan[]>('/tenant/seats/plans'),
      // ]);

      await new Promise((resolve) => setTimeout(resolve, 500));
      overview.value = mockOverview;
      allocations.value = mockAllocations;
      usageHistory.value = mockUsageHistory;
      plans.value = mockPlans;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load seat data';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Request additional seats
   */
  async function requestSeats(additionalSeats: number): Promise<boolean> {
    try {
      // TODO: Replace with real API call
      // await api.post('/tenant/seats/request', { additionalSeats });

      await new Promise((resolve) => setTimeout(resolve, 500));
      // Simulate success
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to request seats';
      return false;
    }
  }

  /**
   * Upgrade plan
   */
  async function upgradePlan(planId: string): Promise<boolean> {
    try {
      // TODO: Replace with real API call
      // await api.post('/tenant/seats/upgrade', { planId });

      await new Promise((resolve) => setTimeout(resolve, 500));
      // Simulate success - update local state
      plans.value = plans.value.map((p) => ({
        ...p,
        isCurrent: p.id === planId,
      }));
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to upgrade plan';
      return false;
    }
  }

  /**
   * Refresh data
   */
  async function refresh(): Promise<void> {
    await fetchSeats();
  }

  return {
    // State
    isLoading,
    error,
    overview,
    allocations,
    usageHistory,
    plans,

    // Computed
    isNearCapacity,
    isAtCapacity,
    effectiveSeatsAvailable,
    currentPlan,
    upgradePlans,

    // Methods
    fetchSeats,
    requestSeats,
    upgradePlan,
    refresh,
    getUsageStatusColor,
    getUsageStatusText,
    formatRole,
    getRoleColor,
  };
}

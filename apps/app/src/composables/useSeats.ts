/**
 * Seats Composable
 * Handles seat management for tenant admins
 */

import type { SeatOverview, SeatAllocation, SeatUsageHistory, SeatPlan } from '@shared/types';
import { ref, computed } from 'vue';
import { useApi } from './useApi';

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
      const api = useApi();
      const [overviewData, allocationsData, historyData, plansData] = await Promise.all([
        api.get<SeatOverview>('/tenant/seats'),
        api.get<SeatAllocation[]>('/tenant/seats/allocations'),
        api.get<SeatUsageHistory[]>('/tenant/seats/history'),
        api.get<SeatPlan[]>('/tenant/seats/plans'),
      ]);

      overview.value = overviewData;
      allocations.value = allocationsData;
      usageHistory.value = historyData;
      plans.value = plansData;
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
      const api = useApi();
      const response = await api.post<{ seatsPurchased: number }>('/tenant/seats/request', { additionalSeats });
      if (overview.value) {
        overview.value.seatsPurchased = response.seatsPurchased;
        overview.value.seatsAvailable = response.seatsPurchased - overview.value.seatsUsed;
        overview.value.usagePercentage = Math.round((overview.value.seatsUsed / response.seatsPurchased) * 100);
      }
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
      const api = useApi();
      await api.post('/tenant/seats/upgrade', { planId });
      // Update local state
      plans.value = plans.value.map((p) => ({
        ...p,
        isCurrent: p.id === planId,
      }));
      // Refresh seats data
      await fetchSeats();
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

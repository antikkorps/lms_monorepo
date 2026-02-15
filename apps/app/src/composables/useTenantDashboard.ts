/**
 * Tenant Dashboard Composable
 * Handles tenant admin dashboard data fetching and state
 */

import type { TenantDashboardStats, TenantMember } from '@shared/types';
import { ref, computed } from 'vue';
import { useApi } from './useApi';

// Activity data point for charts
export interface ActivityDataPoint {
  date: string;
  activeUsers: number;
  completions: number;
}

// Role distribution for charts
export interface RoleDistribution {
  role: string;
  count: number;
  color: string;
}

export function useTenantDashboard() {
  // const api = useApi(); // TODO: Uncomment when API endpoints are ready

  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const stats = ref<TenantDashboardStats | null>(null);
  const recentMembers = ref<TenantMember[]>([]);
  const activityData = ref<ActivityDataPoint[]>([]);
  const roleDistribution = ref<RoleDistribution[]>([]);

  // Computed helpers
  const seatsUsagePercentage = computed(() => {
    if (!stats.value) return 0;
    return Math.round((stats.value.seatsUsed / stats.value.seatsPurchased) * 100);
  });

  const seatsAvailable = computed(() => {
    if (!stats.value) return 0;
    return stats.value.seatsPurchased - stats.value.seatsUsed;
  });

  const hasRecentMembers = computed(() => recentMembers.value.length > 0);

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  function formatRelativeTime(date: Date | null): string {
    if (!date) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return new Date(date).toLocaleDateString();
  }

  /**
   * Fetch dashboard data from API
   */
  async function fetchDashboard(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const api = useApi();
      interface ApiTenantMember {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        fullName: string;
        avatarUrl: string | null;
        role: string;
        status: string;
        lastLoginAt: string | null;
        createdAt: string;
      }
      interface ApiDashboardData {
        stats: TenantDashboardStats;
        recentMembers: ApiTenantMember[];
        activityData: ActivityDataPoint[];
        roleDistribution: RoleDistribution[];
      }
      const data = await api.get<ApiDashboardData>('/tenant/dashboard');
      stats.value = data.stats;
      // Transform dates from strings
      recentMembers.value = data.recentMembers.map((m) => ({
        ...m,
        lastLoginAt: m.lastLoginAt ? new Date(m.lastLoginAt) : null,
        createdAt: new Date(m.createdAt),
      })) as TenantMember[];
      activityData.value = data.activityData;
      roleDistribution.value = data.roleDistribution;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load dashboard';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Refresh dashboard data
   */
  async function refresh(): Promise<void> {
    await fetchDashboard();
  }

  return {
    // State
    isLoading,
    error,
    stats,
    recentMembers,
    activityData,
    roleDistribution,

    // Computed
    seatsUsagePercentage,
    seatsAvailable,
    hasRecentMembers,

    // Methods
    fetchDashboard,
    refresh,
    formatRelativeTime,
  };
}

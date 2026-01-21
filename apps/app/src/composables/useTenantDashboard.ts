/**
 * Tenant Dashboard Composable
 * Handles tenant admin dashboard data fetching and state
 */

import type { TenantDashboardStats, TenantMember } from '@shared/types';
import { ref, computed } from 'vue';
// import { useApi } from './useApi'; // TODO: Uncomment when API endpoints are ready

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

interface TenantDashboardData {
  stats: TenantDashboardStats;
  recentMembers: TenantMember[];
  activityData: ActivityDataPoint[];
  roleDistribution: RoleDistribution[];
}

// Mock data for development (will be replaced by API calls)
const mockData: TenantDashboardData = {
  stats: {
    totalUsers: 45,
    activeUsers: 38,
    seatsUsed: 45,
    seatsPurchased: 50,
    averageProgress: 67,
    completionRate: 42,
    pendingInvitations: 3,
  },
  recentMembers: [
    {
      id: '1',
      email: 'marie.dupont@company.com',
      firstName: 'Marie',
      lastName: 'Dupont',
      fullName: 'Marie Dupont',
      avatarUrl: null,
      role: 'learner',
      status: 'active',
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 30),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
    {
      id: '2',
      email: 'jean.martin@company.com',
      firstName: 'Jean',
      lastName: 'Martin',
      fullName: 'Jean Martin',
      avatarUrl: null,
      role: 'learner',
      status: 'active',
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
    {
      id: '3',
      email: 'sophie.bernard@company.com',
      firstName: 'Sophie',
      lastName: 'Bernard',
      fullName: 'Sophie Bernard',
      avatarUrl: null,
      role: 'manager',
      status: 'active',
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    },
    {
      id: '4',
      email: 'pierre.thomas@company.com',
      firstName: 'Pierre',
      lastName: 'Thomas',
      fullName: 'Pierre Thomas',
      avatarUrl: null,
      role: 'learner',
      status: 'pending',
      lastLoginAt: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    },
    {
      id: '5',
      email: 'claire.petit@company.com',
      firstName: 'Claire',
      lastName: 'Petit',
      fullName: 'Claire Petit',
      avatarUrl: null,
      role: 'instructor',
      status: 'active',
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    },
  ],
  activityData: generateLast30DaysActivity(),
  roleDistribution: [
    { role: 'Learners', count: 38, color: 'hsl(var(--chart-1))' },
    { role: 'Managers', count: 4, color: 'hsl(var(--chart-2))' },
    { role: 'Instructors', count: 2, color: 'hsl(var(--chart-3))' },
    { role: 'Admins', count: 1, color: 'hsl(var(--chart-4))' },
  ],
};

// Generate mock activity data for last 30 days
function generateLast30DaysActivity(): ActivityDataPoint[] {
  const data: ActivityDataPoint[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      activeUsers: Math.floor(Math.random() * 20) + 20,
      completions: Math.floor(Math.random() * 10) + 2,
    });
  }

  return data;
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
      // TODO: Replace with real API calls when endpoints are ready
      // const data = await api.get<TenantDashboardData>('/tenant/dashboard');

      // Using mock data for now
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
      stats.value = mockData.stats;
      recentMembers.value = mockData.recentMembers;
      activityData.value = mockData.activityData;
      roleDistribution.value = mockData.roleDistribution;
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

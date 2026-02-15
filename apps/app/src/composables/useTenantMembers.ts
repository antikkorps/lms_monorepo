/**
 * Tenant Members Composable
 * Handles team member management for tenant admins
 */

import type { TenantMember, UserStatus } from '@shared/types';
import type { Role } from '@shared/types';
import { ref, computed, watch } from 'vue';
import { useApi } from './useApi';

export interface MemberFilters {
  search: string;
  role: Role | 'all';
  status: UserStatus | 'all';
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export function useTenantMembers() {

  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const members = ref<TenantMember[]>([]);

  const filters = ref<MemberFilters>({
    search: '',
    role: 'all',
    status: 'all',
  });

  const pagination = ref<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
  });

  // Computed filtered members
  const filteredMembers = computed(() => {
    let result = [...members.value];

    // Search filter
    if (filters.value.search) {
      const searchLower = filters.value.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.fullName.toLowerCase().includes(searchLower) ||
          m.email.toLowerCase().includes(searchLower),
      );
    }

    // Role filter
    if (filters.value.role !== 'all') {
      result = result.filter((m) => m.role === filters.value.role);
    }

    // Status filter
    if (filters.value.status !== 'all') {
      result = result.filter((m) => m.status === filters.value.status);
    }

    return result;
  });

  // Paginated members
  const paginatedMembers = computed(() => {
    const start = (pagination.value.page - 1) * pagination.value.limit;
    const end = start + pagination.value.limit;
    return filteredMembers.value.slice(start, end);
  });

  // Total pages
  const totalPages = computed(() =>
    Math.ceil(filteredMembers.value.length / pagination.value.limit),
  );

  // Has members
  const hasMembers = computed(() => members.value.length > 0);
  const hasFilteredMembers = computed(() => filteredMembers.value.length > 0);

  // Watch filters and reset page
  watch(filters, () => {
    pagination.value.page = 1;
  }, { deep: true });

  /**
   * Format relative time
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
   * Fetch members from API
   */
  async function fetchMembers(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const api = useApi();
      interface ApiMember {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        fullName: string;
        avatarUrl: string | null;
        role: Role;
        status: UserStatus;
        lastLoginAt: string | null;
        createdAt: string;
      }
      interface ApiResponse {
        members: ApiMember[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }
      const params: Record<string, string | number | boolean | undefined> = {
        page: pagination.value.page,
        limit: pagination.value.limit,
      };
      if (filters.value.search) params.search = filters.value.search;
      if (filters.value.role !== 'all') params.role = filters.value.role;
      if (filters.value.status !== 'all') params.status = filters.value.status;

      const data = await api.get<ApiResponse>('/tenant/members', params);
      // Transform dates from strings
      members.value = data.members.map((m) => ({
        ...m,
        lastLoginAt: m.lastLoginAt ? new Date(m.lastLoginAt) : null,
        createdAt: new Date(m.createdAt),
      }));
      pagination.value.total = data.pagination.total;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load members';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Update member role
   */
  async function updateMemberRole(memberId: string, newRole: Role): Promise<boolean> {
    try {
      const api = useApi();
      await api.patch(`/tenant/members/${memberId}/role`, { role: newRole });
      const member = members.value.find((m) => m.id === memberId);
      if (member) {
        member.role = newRole;
      }
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update role';
      return false;
    }
  }

  /**
   * Suspend member
   */
  async function suspendMember(memberId: string): Promise<boolean> {
    try {
      const api = useApi();
      await api.patch(`/tenant/members/${memberId}/suspend`, {});
      const member = members.value.find((m) => m.id === memberId);
      if (member) {
        member.status = 'suspended';
      }
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to suspend member';
      return false;
    }
  }

  /**
   * Reactivate member
   */
  async function reactivateMember(memberId: string): Promise<boolean> {
    try {
      const api = useApi();
      await api.patch(`/tenant/members/${memberId}/reactivate`, {});
      const member = members.value.find((m) => m.id === memberId);
      if (member) {
        member.status = 'active';
      }
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to reactivate member';
      return false;
    }
  }

  /**
   * Remove member
   */
  async function removeMember(memberId: string): Promise<boolean> {
    try {
      const api = useApi();
      await api.delete(`/tenant/members/${memberId}`);
      members.value = members.value.filter((m) => m.id !== memberId);
      pagination.value.total = members.value.length;
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to remove member';
      return false;
    }
  }

  /**
   * Go to page
   */
  function goToPage(page: number): void {
    if (page >= 1 && page <= totalPages.value) {
      pagination.value.page = page;
    }
  }

  /**
   * Clear filters
   */
  function clearFilters(): void {
    filters.value = {
      search: '',
      role: 'all',
      status: 'all',
    };
  }

  return {
    // State
    isLoading,
    error,
    members,
    filters,
    pagination,

    // Computed
    filteredMembers,
    paginatedMembers,
    totalPages,
    hasMembers,
    hasFilteredMembers,

    // Methods
    fetchMembers,
    updateMemberRole,
    suspendMember,
    reactivateMember,
    removeMember,
    goToPage,
    clearFilters,
    formatRelativeTime,
  };
}

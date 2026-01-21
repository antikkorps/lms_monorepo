/**
 * Invitations Composable
 * Handles invitation management for tenant admins
 */

import type { Invitation, InvitationStatus, CreateInvitationInput } from '@shared/types';
import { ref, computed, watch } from 'vue';
import { useApi } from './useApi';

export interface InvitationFilters {
  status: InvitationStatus | 'all';
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

// Transform API response to frontend type
function transformInvitation(data: Record<string, unknown>): Invitation {
  return {
    id: data.id as string,
    email: data.email as string,
    firstName: data.firstName as string,
    lastName: data.lastName as string,
    fullName: `${data.firstName} ${data.lastName}`,
    role: data.role as Invitation['role'],
    status: data.status as InvitationStatus,
    tenantId: data.tenantId as string,
    tenantName: data.tenantName as string | undefined,
    groupIds: (data.groupIds as string[]) || [],
    invitedBy: data.invitedBy as Invitation['invitedBy'],
    expiresAt: new Date(data.expiresAt as string),
    acceptedAt: data.acceptedAt ? new Date(data.acceptedAt as string) : null,
    createdAt: new Date(data.createdAt as string),
  };
}

export function useInvitations() {
  const api = useApi();

  const isLoading = ref(false);
  const isCreating = ref(false);
  const error = ref<string | null>(null);
  const invitations = ref<Invitation[]>([]);

  const filters = ref<InvitationFilters>({
    status: 'all',
  });

  const pagination = ref<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
  });

  // Computed filtered invitations (client-side filtering for 'all')
  const filteredInvitations = computed(() => {
    if (filters.value.status === 'all') {
      return invitations.value;
    }
    return invitations.value.filter((inv) => inv.status === filters.value.status);
  });

  // Stats computed
  const stats = computed(() => {
    const all = invitations.value;
    return {
      total: all.length,
      pending: all.filter((i) => i.status === 'pending').length,
      accepted: all.filter((i) => i.status === 'accepted').length,
      expired: all.filter((i) => i.status === 'expired').length,
      revoked: all.filter((i) => i.status === 'revoked').length,
    };
  });

  // Total pages
  const totalPages = computed(() =>
    Math.ceil(pagination.value.total / pagination.value.limit),
  );

  // Has invitations
  const hasInvitations = computed(() => invitations.value.length > 0);
  const hasPendingInvitations = computed(() =>
    invitations.value.some((i) => i.status === 'pending'),
  );

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
   * Format expiry time
   */
  function formatExpiryTime(date: Date): string {
    const now = new Date();
    const diffMs = new Date(date).getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) return `${diffHours}h remaining`;
    if (diffDays === 1) return '1 day remaining';
    return `${diffDays} days remaining`;
  }

  /**
   * Check if invitation is expired
   */
  function isExpired(invitation: Invitation): boolean {
    return new Date(invitation.expiresAt) < new Date() || invitation.status === 'expired';
  }

  /**
   * Fetch invitations from API
   */
  async function fetchInvitations(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const params: Record<string, string | number> = {
        page: pagination.value.page,
        limit: pagination.value.limit,
      };

      if (filters.value.status !== 'all') {
        params.status = filters.value.status;
      }

      const response = await api.get<{ invitations: Record<string, unknown>[]; total: number }>(
        '/invitations',
        params,
      );

      invitations.value = response.invitations.map(transformInvitation);
      pagination.value.total = response.total;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load invitations';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Create a new invitation
   */
  async function createInvitation(input: CreateInvitationInput): Promise<Invitation | null> {
    isCreating.value = true;
    error.value = null;

    try {
      const response = await api.post<Record<string, unknown>>('/invitations', input);
      const invitation = transformInvitation(response);

      // Add to list
      invitations.value = [invitation, ...invitations.value];
      pagination.value.total += 1;

      return invitation;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create invitation';
      return null;
    } finally {
      isCreating.value = false;
    }
  }

  /**
   * Resend invitation
   */
  async function resendInvitation(invitationId: string): Promise<boolean> {
    try {
      await api.post(`/invitations/${invitationId}/resend`);

      // Update local invitation expiry
      const invitation = invitations.value.find((i) => i.id === invitationId);
      if (invitation) {
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 7);
        invitation.expiresAt = newExpiry;
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to resend invitation';
      return false;
    }
  }

  /**
   * Revoke/Cancel invitation
   */
  async function revokeInvitation(invitationId: string): Promise<boolean> {
    try {
      await api.delete(`/invitations/${invitationId}`);

      // Update local state
      const invitation = invitations.value.find((i) => i.id === invitationId);
      if (invitation) {
        invitation.status = 'revoked';
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to revoke invitation';
      return false;
    }
  }

  /**
   * Go to page
   */
  function goToPage(page: number): void {
    if (page >= 1 && page <= totalPages.value) {
      pagination.value.page = page;
      fetchInvitations();
    }
  }

  /**
   * Clear filters
   */
  function clearFilters(): void {
    filters.value = {
      status: 'all',
    };
  }

  /**
   * Refresh invitations
   */
  async function refresh(): Promise<void> {
    await fetchInvitations();
  }

  return {
    // State
    isLoading,
    isCreating,
    error,
    invitations,
    filters,
    pagination,

    // Computed
    filteredInvitations,
    stats,
    totalPages,
    hasInvitations,
    hasPendingInvitations,

    // Methods
    fetchInvitations,
    createInvitation,
    resendInvitation,
    revokeInvitation,
    goToPage,
    clearFilters,
    refresh,
    formatRelativeTime,
    formatExpiryTime,
    isExpired,
  };
}

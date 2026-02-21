import { ref, computed } from 'vue';
import { useApi } from './useApi';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  tenantId: string | null;
  tenantName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useAdminUsers() {
  const api = useApi();
  const users = ref<AdminUser[]>([]);
  const pagination = ref<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const search = ref('');
  const roleFilter = ref('');

  const hasUsers = computed(() => users.value.length > 0);

  async function fetchUsers(page = 1) {
    isLoading.value = true;
    error.value = null;
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search.value) params.search = search.value;
      if (roleFilter.value) params.role = roleFilter.value;

      const data = await api.get<{ users: AdminUser[]; pagination: Pagination }>(
        '/admin/users',
        params
      );
      users.value = data.users;
      pagination.value = data.pagination;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load users';
    } finally {
      isLoading.value = false;
    }
  }

  async function updateRole(userId: string, role: string) {
    const data = await api.patch<{ id: string; role: string; previousRole: string }>(
      `/admin/users/${userId}/role`,
      { role }
    );
    // Update local state
    const user = users.value.find((u) => u.id === userId);
    if (user) {
      user.role = data.role;
    }
    return data;
  }

  return {
    users,
    pagination,
    isLoading,
    error,
    search,
    roleFilter,
    hasUsers,
    fetchUsers,
    updateRole,
  };
}

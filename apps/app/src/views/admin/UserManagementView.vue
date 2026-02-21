<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/user';
import { useAdminUsers } from '@/composables/useAdminUsers';
import {
  Search,
  AlertCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  ShieldCheck,
  Shield,
  UserCog,
  GraduationCap,
  BookOpen,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const { t } = useI18n();

const {
  users,
  pagination,
  isLoading,
  error,
  search,
  roleFilter,
  fetchUsers,
  updateRole,
} = useAdminUsers();

const roles = [
  { value: 'super_admin', label: 'Super Admin', icon: ShieldCheck },
  { value: 'tenant_admin', label: 'Tenant Admin', icon: Shield },
  { value: 'manager', label: 'Manager', icon: UserCog },
  { value: 'instructor', label: 'Instructor', icon: BookOpen },
  { value: 'learner', label: 'Learner', icon: GraduationCap },
];

let searchTimeout: ReturnType<typeof setTimeout>;

watch(search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => fetchUsers(1), 300);
});

watch(roleFilter, () => fetchUsers(1));

onMounted(() => fetchUsers());

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' | 'info' | 'warning' | 'destructive' {
  switch (role) {
    case 'super_admin':
      return 'destructive';
    case 'tenant_admin':
      return 'default';
    case 'manager':
      return 'info';
    case 'instructor':
      return 'secondary';
    default:
      return 'outline';
  }
}

function formatRole(role: string): string {
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending':
      return 'warning';
    case 'suspended':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

async function handleRoleChange(userId: string, newRole: string, userName: string) {
  try {
    await updateRole(userId, newRole);
    toast.success(t('admin.userManagement.toast.roleUpdated', { name: userName, role: formatRole(newRole) }));
  } catch (err) {
    toast.error(err instanceof Error ? err.message : t('admin.userManagement.toast.roleUpdateFailed'));
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight">{{ t('admin.userManagement.title') }}</h1>
      <p class="text-muted-foreground">{{ t('admin.userManagement.subtitle') }}</p>
    </div>

    <!-- Filters -->
    <Card>
      <CardContent class="pt-6">
        <div class="flex flex-col gap-4 sm:flex-row">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="search"
              :placeholder="t('admin.userManagement.searchPlaceholder')"
              class="pl-10"
            />
          </div>
          <Select v-model="roleFilter" class="w-full sm:w-48">
            <option value="">{{ t('admin.userManagement.allRoles') }}</option>
            <option v-for="role in roles" :key="role.value" :value="role.value">
              {{ role.label }}
            </option>
          </Select>
        </div>
      </CardContent>
    </Card>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Error -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">{{ t('admin.userManagement.error.loadFailed') }}</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchUsers()">
          {{ t('admin.userManagement.error.retry') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Empty -->
    <Card v-else-if="!users.length">
      <CardContent class="flex flex-col items-center justify-center py-12 text-center">
        <Users class="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 class="text-lg font-semibold">{{ t('admin.userManagement.empty.title') }}</h3>
        <p class="text-muted-foreground">{{ t('admin.userManagement.empty.message') }}</p>
      </CardContent>
    </Card>

    <!-- Users Table -->
    <template v-else>
      <Card>
        <CardHeader>
          <CardTitle>{{ t('admin.userManagement.table.title') }}</CardTitle>
          <CardDescription>
            {{ t('admin.userManagement.showing', { from: (pagination.page - 1) * pagination.limit + 1, to: Math.min(pagination.page * pagination.limit, pagination.total), total: pagination.total }) }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('admin.userManagement.table.user') }}</TableHead>
                <TableHead>{{ t('admin.userManagement.table.role') }}</TableHead>
                <TableHead>{{ t('admin.userManagement.table.status') }}</TableHead>
                <TableHead>{{ t('admin.userManagement.table.tenant') }}</TableHead>
                <TableHead>{{ t('admin.userManagement.table.lastLogin') }}</TableHead>
                <TableHead class="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="user in users" :key="user.id">
                <TableCell>
                  <div class="flex items-center gap-3">
                    <UserAvatar
                      :first-name="user.firstName"
                      :last-name="user.lastName"
                      size="sm"
                    />
                    <div>
                      <p class="font-medium">{{ user.firstName }} {{ user.lastName }}</p>
                      <p class="text-sm text-muted-foreground">{{ user.email }}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge :variant="getRoleBadgeVariant(user.role)">
                    {{ formatRole(user.role) }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge :variant="getStatusBadgeVariant(user.status)">
                    {{ user.status }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span v-if="user.tenantName" class="text-sm">{{ user.tenantName }}</span>
                  <span v-else class="text-sm text-muted-foreground">-</span>
                </TableCell>
                <TableCell class="text-sm text-muted-foreground">
                  {{ formatDate(user.lastLoginAt) }}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal class="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{{ t('admin.userManagement.changeRole') }}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        v-for="role in roles"
                        :key="role.value"
                        :disabled="user.role === role.value"
                        @click="handleRoleChange(user.id, role.value, `${user.firstName} ${user.lastName}`)"
                      >
                        <component :is="role.icon" class="mr-2 h-4 w-4" />
                        {{ role.label }}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="pagination.page <= 1"
          @click="fetchUsers(pagination.page - 1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <span class="text-sm text-muted-foreground">
          {{ pagination.page }} / {{ pagination.totalPages }}
        </span>
        <Button
          variant="outline"
          size="sm"
          :disabled="pagination.page >= pagination.totalPages"
          @click="fetchUsers(pagination.page + 1)"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </template>
  </div>
</template>

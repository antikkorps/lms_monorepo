<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { TenantMember, CreateInvitationInput } from '@shared/types';
import type { Role } from '@shared/types';
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
import { UserAvatar } from '@/components/user';
import { MemberActionsDropdown, InviteMemberModal } from '@/components/admin';
import { MembersTableSkeleton } from '@/components/skeletons';
import { useTenantMembers } from '@/composables/useTenantMembers';
import { useInvitations } from '@/composables/useInvitations';
import {
  Search,
  UserPlus,
  AlertCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  XCircle,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const {
  isLoading,
  error,
  filters,
  pagination,
  paginatedMembers,
  totalPages,
  filteredMembers,
  hasMembers,
  hasFilteredMembers,
  fetchMembers,
  updateMemberRole,
  suspendMember,
  reactivateMember,
  removeMember,
  goToPage,
  clearFilters,
  formatRelativeTime,
} = useTenantMembers();

const {
  isCreating: isInviting,
  createInvitation,
  error: invitationError,
} = useInvitations();

const isInviteModalOpen = ref(false);

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' | 'info' {
  switch (role) {
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

function getStatusBadgeVariant(
  status: string,
): 'default' | 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending':
      return 'warning';
    case 'suspended':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function handleViewMember(member: TenantMember) {
  // TODO: Navigate to member profile or open modal
  toast.info(`Viewing ${member.fullName}`);
}

async function handleChangeRole(member: TenantMember, newRole: Role) {
  const success = await updateMemberRole(member.id, newRole);
  if (success) {
    toast.success(`Role updated to ${formatRole(newRole)}`);
  } else {
    toast.error('Failed to update role');
  }
}

async function handleSuspendMember(member: TenantMember) {
  const success = await suspendMember(member.id);
  if (success) {
    toast.success(`${member.fullName} has been suspended`);
  } else {
    toast.error('Failed to suspend member');
  }
}

async function handleReactivateMember(member: TenantMember) {
  const success = await reactivateMember(member.id);
  if (success) {
    toast.success(`${member.fullName} has been reactivated`);
  } else {
    toast.error('Failed to reactivate member');
  }
}

async function handleRemoveMember(member: TenantMember) {
  // TODO: Add confirmation dialog
  const success = await removeMember(member.id);
  if (success) {
    toast.success(`${member.fullName} has been removed`);
  } else {
    toast.error('Failed to remove member');
  }
}

function handleInvite() {
  isInviteModalOpen.value = true;
}

async function handleInviteSubmit(data: CreateInvitationInput) {
  const invitation = await createInvitation(data);
  if (invitation) {
    toast.success(`Invitation sent to ${data.email}`);
    isInviteModalOpen.value = false;
  } else {
    toast.error(invitationError.value || 'Failed to send invitation');
  }
}

onMounted(() => {
  fetchMembers();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Team Members</h1>
        <p class="text-muted-foreground">Manage your organization's team members.</p>
      </div>
      <Button @click="handleInvite">
        <UserPlus class="mr-2 h-4 w-4" />
        Invite Member
      </Button>
    </div>

    <!-- Loading State -->
    <MembersTableSkeleton v-if="isLoading" />

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">Failed to load members</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchMembers">Retry</Button>
      </CardContent>
    </Card>

    <!-- Content -->
    <template v-else>
      <!-- Filters -->
      <Card>
        <CardContent class="pt-6">
          <div class="flex flex-wrap items-center gap-4">
            <!-- Search -->
            <div class="relative flex-1 min-w-[200px] max-w-sm">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                v-model="filters.search"
                placeholder="Search by name or email..."
                class="pl-10"
              />
            </div>

            <!-- Role filter -->
            <Select v-model="filters.role" class="w-40">
              <option value="all">All Roles</option>
              <option value="learner">Learner</option>
              <option value="instructor">Instructor</option>
              <option value="manager">Manager</option>
              <option value="tenant_admin">Admin</option>
            </Select>

            <!-- Status filter -->
            <Select v-model="filters.status" class="w-40">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </Select>

            <!-- Clear filters -->
            <Button
              v-if="filters.search || filters.role !== 'all' || filters.status !== 'all'"
              variant="ghost"
              size="sm"
              @click="clearFilters"
            >
              <XCircle class="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Empty State -->
      <Card v-if="!hasMembers">
        <CardContent class="flex flex-col items-center justify-center py-12 text-center">
          <Users class="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 class="mb-2 text-lg font-semibold">No members yet</h3>
          <p class="mb-4 text-muted-foreground">
            Start inviting team members to your organization.
          </p>
          <Button @click="handleInvite">
            <UserPlus class="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </CardContent>
      </Card>

      <!-- No Results State -->
      <Card v-else-if="!hasFilteredMembers">
        <CardContent class="flex flex-col items-center justify-center py-12 text-center">
          <Search class="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 class="mb-2 text-lg font-semibold">No members found</h3>
          <p class="mb-4 text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
          <Button variant="outline" @click="clearFilters">Clear Filters</Button>
        </CardContent>
      </Card>

      <!-- Members Table -->
      <Card v-else>
        <CardContent class="p-0">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b bg-muted/50">
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Member
                  </th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Email
                  </th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Role
                  </th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Last Login
                  </th>
                  <th class="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="member in paginatedMembers"
                  :key="member.id"
                  class="border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <UserAvatar
                        :user-id="member.id"
                        :first-name="member.firstName"
                        :last-name="member.lastName"
                        :avatar-url="member.avatarUrl"
                        size="sm"
                      />
                      <span class="font-medium">{{ member.fullName }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-muted-foreground">
                    {{ member.email }}
                  </td>
                  <td class="px-6 py-4">
                    <Badge :variant="getRoleBadgeVariant(member.role)">
                      {{ formatRole(member.role) }}
                    </Badge>
                  </td>
                  <td class="px-6 py-4">
                    <Badge :variant="getStatusBadgeVariant(member.status)">
                      {{ member.status }}
                    </Badge>
                  </td>
                  <td class="px-6 py-4 text-sm text-muted-foreground">
                    {{ formatRelativeTime(member.lastLoginAt) }}
                  </td>
                  <td class="px-6 py-4 text-right">
                    <MemberActionsDropdown
                      :member="member"
                      @view="handleViewMember"
                      @change-role="handleChangeRole"
                      @suspend="handleSuspendMember"
                      @reactivate="handleReactivateMember"
                      @remove="handleRemoveMember"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <!-- Pagination -->
      <div
        v-if="hasFilteredMembers && totalPages > 1"
        class="flex items-center justify-between"
      >
        <p class="text-sm text-muted-foreground">
          Showing {{ (pagination.page - 1) * pagination.limit + 1 }} to
          {{ Math.min(pagination.page * pagination.limit, filteredMembers.length) }} of
          {{ filteredMembers.length }} members
        </p>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            :disabled="pagination.page === 1"
            @click="goToPage(pagination.page - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </Button>
          <div class="flex items-center gap-1">
            <Button
              v-for="page in totalPages"
              :key="page"
              variant="outline"
              size="icon"
              :class="{ 'bg-primary text-primary-foreground': page === pagination.page }"
              @click="goToPage(page)"
            >
              {{ page }}
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            :disabled="pagination.page === totalPages"
            @click="goToPage(pagination.page + 1)"
          >
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </template>

    <!-- Invite Modal -->
    <InviteMemberModal
      v-model:open="isInviteModalOpen"
      :is-submitting="isInviting"
      @submit="handleInviteSubmit"
    />
  </div>
</template>

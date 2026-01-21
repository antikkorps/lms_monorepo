<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Invitation, CreateInvitationInput, Role } from '@shared/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { InviteMemberModal } from '@/components/admin';
import { InvitationsTableSkeleton } from '@/components/skeletons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInvitations } from '@/composables/useInvitations';
import {
  UserPlus,
  AlertCircle,
  Mail,
  MailCheck,
  MailX,
  Clock,
  MoreHorizontal,
  Send,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const {
  isLoading,
  isCreating,
  error,
  filters,
  pagination,
  filteredInvitations,
  stats,
  totalPages,
  hasInvitations,
  fetchInvitations,
  createInvitation,
  resendInvitation,
  revokeInvitation,
  goToPage,
  formatRelativeTime,
  formatExpiryTime,
  isExpired,
} = useInvitations();

const isModalOpen = ref(false);

function getStatusBadgeVariant(
  status: string,
): 'default' | 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'accepted':
      return 'success';
    case 'expired':
      return 'secondary';
    case 'revoked':
      return 'destructive';
    default:
      return 'secondary';
  }
}

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

async function handleCreateInvitation(data: CreateInvitationInput) {
  const invitation = await createInvitation(data);
  if (invitation) {
    toast.success(`Invitation sent to ${data.email}`);
    isModalOpen.value = false;
  } else {
    toast.error(error.value || 'Failed to send invitation');
  }
}

async function handleResendInvitation(invitation: Invitation) {
  const success = await resendInvitation(invitation.id);
  if (success) {
    toast.success(`Invitation resent to ${invitation.email}`);
  } else {
    toast.error(error.value || 'Failed to resend invitation');
  }
}

async function handleRevokeInvitation(invitation: Invitation) {
  const success = await revokeInvitation(invitation.id);
  if (success) {
    toast.success(`Invitation to ${invitation.email} has been revoked`);
  } else {
    toast.error(error.value || 'Failed to revoke invitation');
  }
}

onMounted(() => {
  fetchInvitations();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Invitations</h1>
        <p class="text-muted-foreground">Manage pending invitations to your organization.</p>
      </div>
      <Button @click="isModalOpen = true">
        <UserPlus class="mr-2 h-4 w-4" />
        Invite Member
      </Button>
    </div>

    <!-- Loading State -->
    <InvitationsTableSkeleton v-if="isLoading" />

    <!-- Error State -->
    <Card v-else-if="error && !hasInvitations" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">Failed to load invitations</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchInvitations">Retry</Button>
      </CardContent>
    </Card>

    <!-- Content -->
    <template v-else>
      <!-- Stats Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent class="pt-6">
            <div class="flex items-center gap-2">
              <Mail class="h-4 w-4 text-muted-foreground" />
              <span class="text-sm text-muted-foreground">Total</span>
            </div>
            <p class="text-2xl font-bold mt-1">{{ stats.total }}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="pt-6">
            <div class="flex items-center gap-2">
              <Clock class="h-4 w-4 text-yellow-500" />
              <span class="text-sm text-muted-foreground">Pending</span>
            </div>
            <p class="text-2xl font-bold mt-1">{{ stats.pending }}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="pt-6">
            <div class="flex items-center gap-2">
              <MailCheck class="h-4 w-4 text-green-500" />
              <span class="text-sm text-muted-foreground">Accepted</span>
            </div>
            <p class="text-2xl font-bold mt-1">{{ stats.accepted }}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="pt-6">
            <div class="flex items-center gap-2">
              <MailX class="h-4 w-4 text-gray-500" />
              <span class="text-sm text-muted-foreground">Expired/Revoked</span>
            </div>
            <p class="text-2xl font-bold mt-1">{{ stats.expired + stats.revoked }}</p>
          </CardContent>
        </Card>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-4">
        <Select v-model="filters.status" class="w-40">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </Select>
      </div>

      <!-- Empty State -->
      <Card v-if="!hasInvitations">
        <CardContent class="flex flex-col items-center justify-center py-12 text-center">
          <Mail class="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 class="mb-2 text-lg font-semibold">No invitations yet</h3>
          <p class="mb-4 text-muted-foreground">
            Start inviting team members to your organization.
          </p>
          <Button @click="isModalOpen = true">
            <UserPlus class="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </CardContent>
      </Card>

      <!-- Invitations Table -->
      <Card v-else>
        <CardContent class="p-0">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b bg-muted/50">
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Invitee
                  </th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Role
                  </th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Sent
                  </th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Expires
                  </th>
                  <th class="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="invitation in filteredInvitations"
                  :key="invitation.id"
                  class="border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td class="px-6 py-4">
                    <div>
                      <p class="font-medium">{{ invitation.fullName }}</p>
                      <p class="text-sm text-muted-foreground">{{ invitation.email }}</p>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <Badge :variant="getRoleBadgeVariant(invitation.role)">
                      {{ formatRole(invitation.role) }}
                    </Badge>
                  </td>
                  <td class="px-6 py-4">
                    <Badge :variant="getStatusBadgeVariant(invitation.status)">
                      {{ invitation.status }}
                    </Badge>
                  </td>
                  <td class="px-6 py-4 text-sm text-muted-foreground">
                    {{ formatRelativeTime(invitation.createdAt) }}
                  </td>
                  <td class="px-6 py-4 text-sm">
                    <span
                      :class="
                        isExpired(invitation) ? 'text-destructive' : 'text-muted-foreground'
                      "
                    >
                      {{ formatExpiryTime(invitation.expiresAt) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <DropdownMenu v-if="invitation.status === 'pending'">
                      <DropdownMenuTrigger as-child>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal class="h-4 w-4" />
                          <span class="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" class="w-40">
                        <DropdownMenuItem
                          @click="handleResendInvitation(invitation)"
                          class="cursor-pointer"
                        >
                          <Send class="mr-2 h-4 w-4" />
                          Resend
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          @click="handleRevokeInvitation(invitation)"
                          class="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 class="mr-2 h-4 w-4" />
                          Revoke
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <!-- Pagination -->
      <div
        v-if="hasInvitations && totalPages > 1"
        class="flex items-center justify-between"
      >
        <p class="text-sm text-muted-foreground">
          Page {{ pagination.page }} of {{ totalPages }}
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
      v-model:open="isModalOpen"
      :is-submitting="isCreating"
      @submit="handleCreateInvitation"
    />
  </div>
</template>

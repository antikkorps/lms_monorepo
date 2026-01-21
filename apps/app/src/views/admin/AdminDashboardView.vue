<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { RouterLink } from 'vue-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, DoughnutChart } from '@/components/charts';
import { UserAvatar } from '@/components/user';
import { AdminDashboardSkeleton } from '@/components/skeletons';
import { useTenantDashboard } from '@/composables/useTenantDashboard';
import {
  Users,
  UserCheck,
  BarChart3,
  Mail,
  ArrowRight,
  AlertCircle,
} from 'lucide-vue-next';
import type { ChartData } from 'chart.js';

const {
  isLoading,
  error,
  stats,
  recentMembers,
  activityData,
  roleDistribution,
  seatsUsagePercentage,
  seatsAvailable,
  hasRecentMembers,
  fetchDashboard,
  formatRelativeTime,
} = useTenantDashboard();

// Transform activity data to chart format
const activityChartData = computed<ChartData<'line'>>(() => ({
  labels: activityData.value.map((d) => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }),
  datasets: [
    {
      label: 'Active Users',
      data: activityData.value.map((d) => d.activeUsers),
      borderColor: 'hsl(var(--chart-1))',
      backgroundColor: 'hsla(var(--chart-1), 0.1)',
      fill: true,
      tension: 0.4,
    },
    {
      label: 'Completions',
      data: activityData.value.map((d) => d.completions),
      borderColor: 'hsl(var(--chart-2))',
      backgroundColor: 'hsla(var(--chart-2), 0.1)',
      fill: true,
      tension: 0.4,
    },
  ],
}));

// Transform role distribution to chart format
const roleChartData = computed<ChartData<'doughnut'>>(() => ({
  labels: roleDistribution.value.map((r) => r.role),
  datasets: [
    {
      data: roleDistribution.value.map((r) => r.count),
      backgroundColor: roleDistribution.value.map((r) => r.color),
      borderWidth: 0,
    },
  ],
}));

function getSeatsProgressColor(): string {
  const percentage = seatsUsagePercentage.value;
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 75) return 'bg-yellow-500';
  return 'bg-green-500';
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

onMounted(() => {
  fetchDashboard();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Administration Dashboard</h1>
      <p class="text-muted-foreground">
        Overview of your team's learning activity and progress.
      </p>
    </div>

    <!-- Loading State -->
    <AdminDashboardSkeleton v-if="isLoading" />

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">Failed to load dashboard</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchDashboard">Retry</Button>
      </CardContent>
    </Card>

    <!-- Dashboard Content -->
    <template v-else-if="stats">
      <!-- Stats Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Seats Usage -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Seats Usage</CardTitle>
            <Users class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ stats.seatsUsed }}/{{ stats.seatsPurchased }}
            </div>
            <div class="mt-2">
              <div class="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  :class="getSeatsProgressColor()"
                  class="h-full transition-all"
                  :style="{ width: `${seatsUsagePercentage}%` }"
                />
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ seatsAvailable }} seats available
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- Active Users -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Active Users</CardTitle>
            <UserCheck class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.activeUsers }}</div>
            <p class="text-xs text-muted-foreground">
              of {{ stats.totalUsers }} total users
            </p>
          </CardContent>
        </Card>

        <!-- Avg Completion Rate -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Avg Completion Rate</CardTitle>
            <BarChart3 class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.completionRate }}%</div>
            <p class="text-xs text-muted-foreground">
              {{ stats.averageProgress }}% avg progress
            </p>
          </CardContent>
        </Card>

        <!-- Pending Invitations -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Pending Invitations</CardTitle>
            <Mail class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.pendingInvitations }}</div>
            <p class="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>
      </div>

      <!-- Charts Grid -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Activity Chart -->
        <Card>
          <CardHeader>
            <CardTitle>Activity (Last 30 Days)</CardTitle>
            <CardDescription>Daily active users and course completions</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart :data="activityChartData" :height="256" show-legend />
          </CardContent>
        </Card>

        <!-- Role Distribution Chart -->
        <Card>
          <CardHeader>
            <CardTitle>Team Composition</CardTitle>
            <CardDescription>Distribution of roles in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <DoughnutChart :data="roleChartData" :height="256" />
          </CardContent>
        </Card>
      </div>

      <!-- Recent Members -->
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle>Recent Members</CardTitle>
              <CardDescription>Latest team members added to your organization</CardDescription>
            </div>
            <RouterLink v-if="hasRecentMembers" to="/admin/members">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight class="ml-1 h-4 w-4" />
              </Button>
            </RouterLink>
          </div>
        </CardHeader>
        <CardContent>
          <!-- Empty State -->
          <div
            v-if="!hasRecentMembers"
            class="flex flex-col items-center justify-center py-8 text-center"
          >
            <Users class="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 class="mb-2 text-lg font-semibold">No members yet</h3>
            <p class="mb-4 text-muted-foreground">
              Start inviting team members to your organization.
            </p>
            <RouterLink to="/admin/members">
              <Button>
                Invite Members
                <ArrowRight class="ml-2 h-4 w-4" />
              </Button>
            </RouterLink>
          </div>

          <!-- Members List -->
          <div v-else class="space-y-4">
            <div
              v-for="member in recentMembers"
              :key="member.id"
              class="flex items-center gap-4 rounded-lg border p-4"
            >
              <UserAvatar
                :user-id="member.id"
                :first-name="member.firstName"
                :last-name="member.lastName"
                :avatar-url="member.avatarUrl"
                size="sm"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium">{{ member.fullName }}</p>
                <p class="truncate text-sm text-muted-foreground">{{ member.email }}</p>
              </div>
              <Badge :variant="getRoleBadgeVariant(member.role)">
                {{ formatRole(member.role) }}
              </Badge>
              <Badge :variant="getStatusBadgeVariant(member.status)">
                {{ member.status }}
              </Badge>
              <span class="text-sm text-muted-foreground">
                {{ formatRelativeTime(member.lastLoginAt) }}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>

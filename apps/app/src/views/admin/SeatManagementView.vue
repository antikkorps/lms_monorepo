<script setup lang="ts">
import { onMounted, computed } from 'vue';
import type { ChartData } from 'chart.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SeatsManagementSkeleton } from '@/components/skeletons';
import { DoughnutChart, LineChart } from '@/components/charts';
import { useSeats } from '@/composables/useSeats';
import {
  Users,
  UserCheck,
  UserMinus,
  Clock,
  AlertCircle,
  TrendingUp,
  Check,
  Zap,
  Crown,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const {
  isLoading,
  error,
  overview,
  allocations,
  usageHistory,
  plans,
  isNearCapacity,
  isAtCapacity,
  effectiveSeatsAvailable,
  currentPlan,
  upgradePlans,
  fetchSeats,
  requestSeats,
  upgradePlan,
  getUsageStatusColor,
  getUsageStatusText,
  formatRole,
  getRoleColor,
} = useSeats();

// Chart data
const allocationChartData = computed<ChartData<'doughnut'>>(() => ({
  labels: allocations.value.map((a) => formatRole(a.role)),
  datasets: [
    {
      data: allocations.value.map((a) => a.count),
      backgroundColor: allocations.value.map((a) => getRoleColor(a.role)),
      borderWidth: 0,
    },
  ],
}));

const usageHistoryChartData = computed<ChartData<'line'>>(() => ({
  labels: usageHistory.value.map((h) => {
    const [year, month] = h.date.split('-');
    return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });
  }),
  datasets: [
    {
      label: 'Seats Used',
      data: usageHistory.value.map((h) => h.used),
      borderColor: 'hsl(var(--chart-1))',
      backgroundColor: 'hsla(var(--chart-1), 0.1)',
      fill: true,
      tension: 0.3,
    },
    {
      label: 'Seats Purchased',
      data: usageHistory.value.map((h) => h.purchased),
      borderColor: 'hsl(var(--chart-2))',
      backgroundColor: 'transparent',
      borderDash: [5, 5],
      tension: 0.3,
    },
  ],
}));

async function handleRequestSeats() {
  const success = await requestSeats(10);
  if (success) {
    toast.success('Seat request submitted successfully');
  } else {
    toast.error('Failed to submit seat request');
  }
}

async function handleUpgradePlan(planId: string) {
  const success = await upgradePlan(planId);
  if (success) {
    toast.success('Plan upgraded successfully');
  } else {
    toast.error('Failed to upgrade plan');
  }
}

function getPlanIcon(planId: string) {
  switch (planId) {
    case 'starter':
      return Users;
    case 'professional':
      return Zap;
    case 'enterprise':
      return Crown;
    default:
      return Users;
  }
}

onMounted(() => {
  fetchSeats();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Seat Management</h1>
        <p class="text-muted-foreground">Monitor and manage your organization's seat allocation.</p>
      </div>
      <Button @click="handleRequestSeats" :disabled="isLoading">
        <TrendingUp class="mr-2 h-4 w-4" />
        Request More Seats
      </Button>
    </div>

    <!-- Loading State -->
    <SeatsManagementSkeleton v-if="isLoading" />

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">Failed to load seat data</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchSeats">Retry</Button>
      </CardContent>
    </Card>

    <!-- Content -->
    <template v-else-if="overview">
      <!-- Alert Banner -->
      <Card v-if="isAtCapacity" class="border-destructive bg-destructive/5">
        <CardContent class="flex items-center gap-4 py-4">
          <AlertCircle class="h-6 w-6 text-destructive" />
          <div class="flex-1">
            <p class="font-medium text-destructive">You've reached your seat limit</p>
            <p class="text-sm text-muted-foreground">
              Upgrade your plan or request additional seats to invite more members.
            </p>
          </div>
          <Button variant="destructive" size="sm" @click="handleRequestSeats">
            Request Seats
          </Button>
        </CardContent>
      </Card>

      <Card v-else-if="isNearCapacity" class="border-yellow-500 bg-yellow-500/5">
        <CardContent class="flex items-center gap-4 py-4">
          <AlertCircle class="h-6 w-6 text-yellow-600" />
          <div class="flex-1">
            <p class="font-medium text-yellow-600">Approaching seat limit</p>
            <p class="text-sm text-muted-foreground">
              {{ overview.usagePercentage }}% of your seats are in use.
              Consider upgrading soon.
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- Overview Cards -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Seats Purchased</CardTitle>
            <Users class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ overview.seatsPurchased }}</div>
            <p class="text-xs text-muted-foreground">
              {{ currentPlan?.name || 'Current' }} plan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Seats Used</CardTitle>
            <UserCheck class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ overview.seatsUsed }}</div>
            <p class="text-xs text-muted-foreground">
              {{ overview.usagePercentage }}% utilization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Available</CardTitle>
            <UserMinus class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ overview.seatsAvailable }}</div>
            <p class="text-xs text-muted-foreground">
              {{ effectiveSeatsAvailable }} after pending invites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Pending Invitations</CardTitle>
            <Clock class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ overview.pendingInvitations }}</div>
            <p class="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Usage Progress Bar -->
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle>Seat Usage</CardTitle>
              <CardDescription>
                {{ overview.seatsUsed }} of {{ overview.seatsPurchased }} seats used
              </CardDescription>
            </div>
            <Badge
              :class="[
                getUsageStatusColor(),
                'text-white'
              ]"
            >
              {{ getUsageStatusText() }}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress
            :value="overview.usagePercentage"
            :indicator-class="getUsageStatusColor()"
            class="h-4"
          />
          <div class="mt-2 flex justify-between text-sm text-muted-foreground">
            <span>{{ overview.seatsUsed }} used</span>
            <span>{{ overview.seatsAvailable }} available</span>
          </div>
        </CardContent>
      </Card>

      <!-- Charts Grid -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Allocation by Role -->
        <Card>
          <CardHeader>
            <CardTitle>Allocation by Role</CardTitle>
            <CardDescription>
              How seats are distributed across roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DoughnutChart
              :data="allocationChartData"
              :height="280"
              :show-legend="true"
            />
            <div class="mt-4 space-y-2">
              <div
                v-for="allocation in allocations"
                :key="allocation.role"
                class="flex items-center justify-between text-sm"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="h-3 w-3 rounded-full"
                    :style="{ backgroundColor: getRoleColor(allocation.role) }"
                  />
                  <span>{{ formatRole(allocation.role) }}</span>
                </div>
                <span class="text-muted-foreground">
                  {{ allocation.count }} ({{ allocation.percentage.toFixed(1) }}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Usage History -->
        <Card>
          <CardHeader>
            <CardTitle>Usage History</CardTitle>
            <CardDescription>
              Seat usage over the last 12 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              :data="usageHistoryChartData"
              :height="280"
              :show-legend="true"
            />
          </CardContent>
        </Card>
      </div>

      <!-- Plans Section -->
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plans</CardTitle>
          <CardDescription>
            Choose a plan that fits your organization's needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 md:grid-cols-3">
            <Card
              v-for="plan in plans"
              :key="plan.id"
              :class="[
                'relative transition-all',
                plan.isCurrent && 'border-primary ring-2 ring-primary/20',
                plan.isRecommended && !plan.isCurrent && 'border-yellow-500',
              ]"
            >
              <!-- Badges -->
              <div class="absolute -top-3 left-4 flex gap-2">
                <Badge v-if="plan.isCurrent" variant="default">
                  Current Plan
                </Badge>
                <Badge v-if="plan.isRecommended && !plan.isCurrent" class="bg-yellow-500">
                  Recommended
                </Badge>
              </div>

              <CardHeader class="pt-6">
                <div class="flex items-center gap-2">
                  <component :is="getPlanIcon(plan.id)" class="h-5 w-5" />
                  <CardTitle>{{ plan.name }}</CardTitle>
                </div>
                <div class="mt-2">
                  <span class="text-3xl font-bold">${{ plan.pricePerSeat }}</span>
                  <span class="text-muted-foreground">/seat/month</span>
                </div>
                <CardDescription>
                  Up to {{ plan.seats }} seats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul class="space-y-2">
                  <li
                    v-for="feature in plan.features"
                    :key="feature"
                    class="flex items-center gap-2 text-sm"
                  >
                    <Check class="h-4 w-4 text-green-500" />
                    {{ feature }}
                  </li>
                </ul>
                <Button
                  v-if="!plan.isCurrent"
                  class="mt-4 w-full"
                  :variant="plan.isRecommended ? 'default' : 'outline'"
                  @click="handleUpgradePlan(plan.id)"
                >
                  Upgrade to {{ plan.name }}
                </Button>
                <Button
                  v-else
                  class="mt-4 w-full"
                  variant="secondary"
                  disabled
                >
                  Current Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>

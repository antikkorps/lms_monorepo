<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, BarChart, DoughnutChart } from '@/components/charts';
import { AdminAnalyticsSkeleton } from '@/components/skeletons';
import { useAdminAnalytics } from '@/composables/useAdminAnalytics';
import {
  DollarSign,
  Users,
  UserCheck,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Download,
  AlertCircle,
} from 'lucide-vue-next';
import type { ChartData } from 'chart.js';
import type { AnalyticsPeriod } from '@shared/types';

const { t } = useI18n();

const {
  period,
  isLoading,
  error,
  overview,
  revenue,
  engagement,
  fetchAll,
  changePeriod,
  exportCsv,
} = useAdminAnalytics();

const periods: { value: AnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '12m', label: '12m' },
];

// Revenue line chart
const revenueChartData = computed<ChartData<'line'>>(() => {
  const ts = revenue.value?.timeSeries || [];
  return {
    labels: ts.map((p) => {
      const date = new Date(p.date);
      return period.value === '12m'
        ? date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: t('admin.analytics.charts.revenue'),
        data: ts.map((p) => p.amount),
        borderColor: 'hsl(var(--chart-1))',
        backgroundColor: 'hsla(var(--chart-1), 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };
});

// Engagement bar chart
const engagementChartData = computed<ChartData<'bar'>>(() => {
  const daily = engagement.value?.dailyEngagement || [];
  return {
    labels: daily.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: t('admin.analytics.charts.activeUsers'),
        data: daily.map((d) => d.activeUsers),
        backgroundColor: 'hsl(var(--chart-1))',
      },
      {
        label: t('admin.analytics.charts.completions'),
        data: daily.map((d) => d.completions),
        backgroundColor: 'hsl(var(--chart-2))',
      },
    ],
  };
});

// Category doughnut chart
const categoryChartData = computed<ChartData<'doughnut'>>(() => {
  const cats = engagement.value?.categoryDistribution || [];
  return {
    labels: cats.map((c) => formatCategory(c.category)),
    datasets: [
      {
        data: cats.map((c) => c.count),
        backgroundColor: cats.map((c) => c.color),
        borderWidth: 0,
      },
    ],
  };
});

function formatCategory(category: string): string {
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}%`;
  if (delta < 0) return `${delta}%`;
  return '0%';
}

onMounted(() => {
  fetchAll();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">{{ t('admin.analytics.title') }}</h1>
        <p class="text-muted-foreground">{{ t('admin.analytics.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex rounded-lg border">
          <Button
            v-for="p in periods"
            :key="p.value"
            :variant="period === p.value ? 'default' : 'ghost'"
            size="sm"
            class="rounded-none first:rounded-l-lg last:rounded-r-lg"
            @click="changePeriod(p.value)"
          >
            {{ p.label }}
          </Button>
        </div>
        <Button variant="outline" size="sm" @click="exportCsv('overview')">
          <Download class="mr-1 h-4 w-4" />
          {{ t('admin.analytics.export') }}
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <AdminAnalyticsSkeleton v-if="isLoading" />

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">{{ t('admin.analytics.error.loadFailed') }}</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchAll">
          {{ t('admin.analytics.error.retry') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Dashboard Content -->
    <template v-else-if="overview">
      <!-- KPI Stat Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Net Revenue -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('admin.analytics.stats.netRevenue') }}</CardTitle>
            <DollarSign class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ formatCurrency(overview.totalRevenue) }}</div>
            <p class="flex items-center gap-1 text-xs text-muted-foreground">
              <component
                :is="overview.deltas.revenue >= 0 ? TrendingUp : TrendingDown"
                :class="overview.deltas.revenue >= 0 ? 'text-green-500' : 'text-red-500'"
                class="h-3 w-3"
              />
              <span :class="overview.deltas.revenue >= 0 ? 'text-green-500' : 'text-red-500'">
                {{ formatDelta(overview.deltas.revenue) }}
              </span>
              {{ t('admin.analytics.stats.vsPreviousPeriod') }}
            </p>
          </CardContent>
        </Card>

        <!-- New Users -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('admin.analytics.stats.newUsers') }}</CardTitle>
            <Users class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ overview.newUsers }}</div>
            <p class="flex items-center gap-1 text-xs text-muted-foreground">
              <component
                :is="overview.deltas.users >= 0 ? TrendingUp : TrendingDown"
                :class="overview.deltas.users >= 0 ? 'text-green-500' : 'text-red-500'"
                class="h-3 w-3"
              />
              <span :class="overview.deltas.users >= 0 ? 'text-green-500' : 'text-red-500'">
                {{ formatDelta(overview.deltas.users) }}
              </span>
              {{ t('admin.analytics.stats.vsPreviousPeriod') }}
            </p>
          </CardContent>
        </Card>

        <!-- Active Users -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('admin.analytics.stats.activeUsers') }}</CardTitle>
            <UserCheck class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ overview.activeUsers }}</div>
            <p class="flex items-center gap-1 text-xs text-muted-foreground">
              <component
                :is="overview.deltas.activeUsers >= 0 ? TrendingUp : TrendingDown"
                :class="overview.deltas.activeUsers >= 0 ? 'text-green-500' : 'text-red-500'"
                class="h-3 w-3"
              />
              <span :class="overview.deltas.activeUsers >= 0 ? 'text-green-500' : 'text-red-500'">
                {{ formatDelta(overview.deltas.activeUsers) }}
              </span>
              {{ t('admin.analytics.stats.vsPreviousPeriod') }}
            </p>
          </CardContent>
        </Card>

        <!-- Completion Rate -->
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('admin.analytics.stats.completionRate') }}</CardTitle>
            <GraduationCap class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ overview.completionRate }}%</div>
            <p class="flex items-center gap-1 text-xs text-muted-foreground">
              <component
                :is="overview.deltas.completionRate >= 0 ? TrendingUp : TrendingDown"
                :class="overview.deltas.completionRate >= 0 ? 'text-green-500' : 'text-red-500'"
                class="h-3 w-3"
              />
              <span :class="overview.deltas.completionRate >= 0 ? 'text-green-500' : 'text-red-500'">
                {{ formatDelta(overview.deltas.completionRate) }}
              </span>
              {{ t('admin.analytics.stats.vsPreviousPeriod') }}
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Charts Grid -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Revenue Chart -->
        <Card>
          <CardHeader>
            <CardTitle>{{ t('admin.analytics.charts.revenueOverTime') }}</CardTitle>
            <CardDescription>{{ t('admin.analytics.charts.revenueDescription') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart :data="revenueChartData" :height="256" />
          </CardContent>
        </Card>

        <!-- Engagement Chart -->
        <Card>
          <CardHeader>
            <CardTitle>{{ t('admin.analytics.charts.dailyEngagement') }}</CardTitle>
            <CardDescription>{{ t('admin.analytics.charts.engagementDescription') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart :data="engagementChartData" :height="256" show-legend stacked />
          </CardContent>
        </Card>
      </div>

      <!-- Secondary Sections -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Top Courses Table -->
        <Card>
          <CardHeader>
            <CardTitle>{{ t('admin.analytics.topCourses.title') }}</CardTitle>
            <CardDescription>{{ t('admin.analytics.topCourses.description') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="revenue?.topCourses.length" class="space-y-3">
              <div
                v-for="(course, index) in revenue.topCourses"
                :key="course.courseId"
                class="flex items-center justify-between rounded-lg border p-3"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {{ index + 1 }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate font-medium text-sm">{{ course.title }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ course.sales }} {{ t('admin.analytics.topCourses.sales') }}
                    </p>
                  </div>
                </div>
                <span class="shrink-0 font-semibold">{{ formatCurrency(course.revenue) }}</span>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center py-8 text-center">
              <DollarSign class="mb-2 h-8 w-8 text-muted-foreground" />
              <p class="text-sm text-muted-foreground">{{ t('admin.analytics.topCourses.empty') }}</p>
            </div>
          </CardContent>
        </Card>

        <!-- Category Distribution -->
        <Card>
          <CardHeader>
            <CardTitle>{{ t('admin.analytics.categories.title') }}</CardTitle>
            <CardDescription>{{ t('admin.analytics.categories.description') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <DoughnutChart
              v-if="engagement?.categoryDistribution.length"
              :data="categoryChartData"
              :height="256"
            />
            <div v-else class="flex flex-col items-center justify-center py-8 text-center">
              <GraduationCap class="mb-2 h-8 w-8 text-muted-foreground" />
              <p class="text-sm text-muted-foreground">{{ t('admin.analytics.categories.empty') }}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>

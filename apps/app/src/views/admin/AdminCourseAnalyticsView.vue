<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
import { AdminCourseAnalyticsSkeleton } from '@/components/skeletons';
import { useCourseAnalytics } from '@/composables/useCourseAnalytics';
import {
  ArrowLeft,
  DollarSign,
  Users,
  GraduationCap,
  Brain,
  AlertCircle,
  Clock,
} from 'lucide-vue-next';
import type { ChartData } from 'chart.js';
import type { AnalyticsPeriod } from '@shared/types';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const courseId = route.params.courseId as string;

const {
  period,
  isLoading,
  error,
  data,
  learnerPage,
  fetchData,
  changePeriod,
  changeLearnerPage,
} = useCourseAnalytics(courseId);

const periods: { value: AnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '12m', label: '12m' },
];

const enrollmentChartData = computed<ChartData<'line'>>(() => {
  const ts = data.value?.enrollmentTimeSeries || [];
  return {
    labels: ts.map((e) => {
      const date = new Date(e.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      label: t('admin.analytics.courseDetail.enrollments'),
      data: ts.map((e) => e.count),
      borderColor: 'hsl(var(--chart-1))',
      backgroundColor: 'hsla(var(--chart-1), 0.1)',
      fill: true,
      tension: 0.4,
    }],
  };
});

const funnelChartData = computed<ChartData<'bar'>>(() => {
  const funnel = data.value?.completionFunnel;
  if (!funnel) return { labels: [], datasets: [] };
  return {
    labels: [
      t('admin.analytics.courseDetail.enrolled'),
      t('admin.analytics.courseDetail.started'),
      t('admin.analytics.courseDetail.completed'),
    ],
    datasets: [{
      label: t('admin.analytics.courseDetail.completionFunnel'),
      data: [funnel.enrolled, funnel.started, funnel.completed],
      backgroundColor: [
        'hsl(var(--chart-1))',
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
      ],
    }],
  };
});

const revenueSplitChartData = computed<ChartData<'doughnut'>>(() => {
  const rev = data.value?.revenue;
  if (!rev || (rev.b2c === 0 && rev.b2b === 0)) return { labels: [], datasets: [] };
  return {
    labels: [t('admin.analytics.courseDetail.b2c'), t('admin.analytics.courseDetail.b2b')],
    datasets: [{
      data: [rev.b2c, rev.b2b],
      backgroundColor: ['hsl(var(--chart-1))', 'hsl(var(--chart-4))'],
      borderWidth: 0,
    }],
  };
});

const reviewChartData = computed<ChartData<'bar'>>(() => {
  const reviews = data.value?.reviews;
  if (!reviews) return { labels: [], datasets: [] };
  return {
    labels: ['1', '2', '3', '4', '5'].map((s) => `${s} ${t('admin.analytics.courseDetail.stars')}`),
    datasets: [{
      label: t('admin.analytics.courseDetail.reviewDistribution'),
      data: [1, 2, 3, 4, 5].map((r) => reviews.distribution[String(r)] || 0),
      backgroundColor: 'hsl(var(--chart-2))',
    }],
  };
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

const totalPages = computed(() => {
  if (!data.value) return 1;
  return Math.ceil(data.value.learners.total / data.value.learners.pageSize);
});

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="icon" @click="router.push({ name: 'admin-analytics' })">
          <ArrowLeft class="h-5 w-5" />
        </Button>
        <div>
          <h1 class="text-2xl font-bold tracking-tight">
            {{ data?.title || t('admin.analytics.courseDetail.back') }}
          </h1>
          <p class="text-sm text-muted-foreground">{{ t('admin.analytics.courseDetail.back') }}</p>
        </div>
      </div>
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
    </div>

    <!-- Loading -->
    <AdminCourseAnalyticsSkeleton v-if="isLoading" />

    <!-- Error -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">{{ t('admin.analytics.error.loadFailed') }}</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchData">
          {{ t('admin.analytics.error.retry') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Content -->
    <template v-else-if="data">
      <!-- KPI Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('admin.analytics.courseDetail.revenue') }}</CardTitle>
            <DollarSign class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ formatCurrency(data.revenue.total) }}</div>
            <p v-if="data.revenue.b2b > 0" class="text-xs text-muted-foreground">
              B2C: {{ formatCurrency(data.revenue.b2c) }} | B2B: {{ formatCurrency(data.revenue.b2b) }}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('admin.analytics.courseDetail.enrollments') }}</CardTitle>
            <Users class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ data.completionFunnel.enrolled }}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('admin.analytics.courseDetail.completionRate') }}</CardTitle>
            <GraduationCap class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ data.completionFunnel.enrolled > 0
                ? Math.round((data.completionFunnel.completed / data.completionFunnel.enrolled) * 100)
                : 0
              }}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('admin.analytics.courseDetail.avgQuizScore') }}</CardTitle>
            <Brain class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ data.quizPerformance ? `${data.quizPerformance.avgScore}%` : '-' }}
            </div>
            <p v-if="data.quizPerformance" class="text-xs text-muted-foreground">
              {{ t('admin.analytics.courseDetail.passRate') }}: {{ data.quizPerformance.passRate }}%
              ({{ data.quizPerformance.totalAttempts }} {{ t('admin.analytics.courseDetail.totalAttempts') }})
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Charts -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Enrollment line chart -->
        <Card>
          <CardHeader>
            <CardTitle>{{ t('admin.analytics.courseDetail.enrollmentOverTime') }}</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart v-if="data.enrollmentTimeSeries.length" :data="enrollmentChartData" :height="220" />
            <p v-else class="py-8 text-center text-sm text-muted-foreground">{{ t('admin.analytics.courseDetail.noData') }}</p>
          </CardContent>
        </Card>

        <!-- Completion funnel -->
        <Card>
          <CardHeader>
            <CardTitle>{{ t('admin.analytics.courseDetail.completionFunnel') }}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart :data="funnelChartData" :height="220" />
          </CardContent>
        </Card>

        <!-- Revenue split doughnut -->
        <Card>
          <CardHeader>
            <CardTitle>{{ t('admin.analytics.courseDetail.revenueSplit') }}</CardTitle>
          </CardHeader>
          <CardContent>
            <DoughnutChart
              v-if="data.revenue.total > 0"
              :data="revenueSplitChartData"
              :height="220"
            />
            <p v-else class="py-8 text-center text-sm text-muted-foreground">{{ t('admin.analytics.courseDetail.noData') }}</p>
          </CardContent>
        </Card>

        <!-- Review distribution -->
        <Card>
          <CardHeader>
            <CardTitle>{{ t('admin.analytics.courseDetail.reviewDistribution') }}</CardTitle>
            <CardDescription v-if="data.reviews">
              {{ data.reviews.avgRating }} {{ t('admin.analytics.courseDetail.avgRating') }}
              ({{ data.reviews.total }})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart v-if="data.reviews" :data="reviewChartData" :height="220" />
            <p v-else class="py-8 text-center text-sm text-muted-foreground">{{ t('admin.analytics.courseDetail.noData') }}</p>
          </CardContent>
        </Card>
      </div>

      <!-- Watch Time -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Clock class="h-5 w-5" />
            {{ t('admin.analytics.courseDetail.watchTime') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex gap-8">
            <div>
              <p class="text-sm text-muted-foreground">{{ t('admin.analytics.courseDetail.totalWatchTime') }}</p>
              <p class="text-xl font-bold">{{ formatDuration(data.watchTime.totalSeconds) }}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">{{ t('admin.analytics.courseDetail.avgWatchTime') }}</p>
              <p class="text-xl font-bold">{{ formatDuration(data.watchTime.avgSeconds) }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Learner Progress Table -->
      <Card>
        <CardHeader>
          <CardTitle>{{ t('admin.analytics.courseDetail.learnerProgress') }}</CardTitle>
          <CardDescription>{{ data.learners.total }} {{ t('admin.analytics.courseDetail.enrollments').toLowerCase() }}</CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="data.learners.items.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b text-left">
                  <th class="pb-2 font-medium">{{ t('admin.analytics.courseDetail.name') }}</th>
                  <th class="pb-2 font-medium">{{ t('admin.analytics.courseDetail.email') }}</th>
                  <th class="pb-2 font-medium">{{ t('admin.analytics.courseDetail.progress') }}</th>
                  <th class="pb-2 font-medium">{{ t('admin.analytics.courseDetail.lessonsCompleted') }}</th>
                  <th class="pb-2 font-medium">{{ t('admin.analytics.courseDetail.watchTime') }}</th>
                  <th class="pb-2 font-medium">{{ t('admin.analytics.courseDetail.lastActive') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="learner in data.learners.items"
                  :key="learner.userId"
                  class="border-b last:border-0"
                >
                  <td class="py-2">{{ learner.firstName }} {{ learner.lastName }}</td>
                  <td class="py-2 text-muted-foreground">{{ learner.email }}</td>
                  <td class="py-2">
                    <div class="flex items-center gap-2">
                      <div class="h-2 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          class="h-full rounded-full bg-primary"
                          :style="{ width: `${learner.progressPercent}%` }"
                        />
                      </div>
                      <span class="text-xs">{{ learner.progressPercent }}%</span>
                    </div>
                  </td>
                  <td class="py-2">{{ learner.lessonsCompleted }}/{{ learner.totalLessons }}</td>
                  <td class="py-2">{{ formatDuration(learner.watchTimeSeconds) }}</td>
                  <td class="py-2 text-muted-foreground">
                    {{ learner.lastActiveAt
                      ? new Date(learner.lastActiveAt).toLocaleDateString()
                      : '-'
                    }}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Pagination -->
            <div v-if="totalPages > 1" class="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="learnerPage <= 1"
                @click="changeLearnerPage(learnerPage - 1)"
              >
                Previous
              </Button>
              <span class="text-sm text-muted-foreground">
                {{ learnerPage }} / {{ totalPages }}
              </span>
              <Button
                variant="outline"
                size="sm"
                :disabled="learnerPage >= totalPages"
                @click="changeLearnerPage(learnerPage + 1)"
              >
                Next
              </Button>
            </div>
          </div>
          <p v-else class="py-8 text-center text-sm text-muted-foreground">
            {{ t('admin.analytics.courseDetail.noData') }}
          </p>
        </CardContent>
      </Card>
    </template>
  </div>
</template>

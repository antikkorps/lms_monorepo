<script setup lang="ts">
import { onMounted } from 'vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  Clock,
  BookOpen,
  Trophy,
  Flame,
  Target,
  AlertCircle,
} from 'lucide-vue-next';
import { useAnalytics } from '@/composables/useAnalytics';
import { LineChart, BarChart, DoughnutChart } from '@/components/charts';

const {
  isLoading,
  error,
  summary,
  activityChartData,
  lessonsChartData,
  progressChartData,
  categoryChartData,
  fetchAnalytics,
  formatMinutes,
} = useAnalytics();

onMounted(() => {
  fetchAnalytics();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Learning Analytics</h1>
      <p class="text-muted-foreground">Track your learning progress and activity</p>
    </div>

    <!-- Loading State -->
    <template v-if="isLoading">
      <!-- Stats skeleton -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card v-for="n in 4" :key="n">
          <CardHeader class="pb-2">
            <Skeleton class="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton class="h-8 w-16 mb-1" />
            <Skeleton class="h-3 w-20" />
          </CardContent>
        </Card>
      </div>
      <!-- Charts skeleton -->
      <div class="grid gap-6 lg:grid-cols-2">
        <Card v-for="n in 4" :key="n">
          <CardHeader>
            <Skeleton class="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton class="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </template>

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">Failed to load analytics</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchAnalytics">Retry</Button>
      </CardContent>
    </Card>

    <!-- Content -->
    <template v-else-if="summary">
      <!-- Summary Stats -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Total Learning Time</CardTitle>
            <Clock class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ formatMinutes(summary.totalMinutes) }}</div>
            <p class="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Lessons Completed</CardTitle>
            <BookOpen class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ summary.completedLessons }}</div>
            <p class="text-xs text-muted-foreground">
              of {{ summary.totalLessons }} total lessons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Current Streak</CardTitle>
            <Flame class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ summary.currentStreak }} days</div>
            <p class="text-xs text-muted-foreground">
              Best: {{ summary.longestStreak }} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Quiz Average</CardTitle>
            <Target class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ summary.averageQuizScore }}%</div>
            <p class="text-xs text-muted-foreground">Average score</p>
          </CardContent>
        </Card>
      </div>

      <!-- Charts Grid -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Activity Line Chart -->
        <Card class="lg:col-span-2">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <TrendingUp class="h-5 w-5" />
              Learning Activity
            </CardTitle>
            <CardDescription>Minutes spent learning over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart :data="activityChartData" :height="300" />
          </CardContent>
        </Card>

        <!-- Lessons Bar Chart -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <BookOpen class="h-5 w-5" />
              Lessons Completed
            </CardTitle>
            <CardDescription>Daily lesson completion</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart :data="lessonsChartData" :height="250" />
          </CardContent>
        </Card>

        <!-- Category Distribution -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Trophy class="h-5 w-5" />
              Learning Focus
            </CardTitle>
            <CardDescription>Lessons by category</CardDescription>
          </CardHeader>
          <CardContent>
            <DoughnutChart :data="categoryChartData" :height="250" />
          </CardContent>
        </Card>

        <!-- Course Progress -->
        <Card class="lg:col-span-2">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Target class="h-5 w-5" />
              Course Progress
            </CardTitle>
            <CardDescription>Progress on enrolled courses</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart :data="progressChartData" :height="250" horizontal />
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>

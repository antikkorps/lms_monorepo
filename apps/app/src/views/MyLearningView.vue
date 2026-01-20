<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen,
  Trophy,
  Clock,
  Flame,
  AlertCircle,
  ArrowRight,
  GraduationCap,
  PlayCircle,
} from 'lucide-vue-next';
import ProgressCard from '@/components/progress/ProgressCard.vue';
import { useProgress, type ProgressFilter, type ProgressSortBy } from '@/composables/useProgress';

const {
  isLoading,
  error,
  courses,
  stats,
  filter,
  sortBy,
  inProgressCourses,
  completedCourses,
  fetchProgress,
  setFilter,
  setSortBy,
  formatDuration,
} = useProgress();

const filterOptions: { value: ProgressFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const sortOptions: { value: ProgressSortBy; label: string }[] = [
  { value: 'recent', label: 'Recently Accessed' },
  { value: 'progress', label: 'Progress' },
  { value: 'title', label: 'Title' },
];

onMounted(() => {
  fetchProgress();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">My Learning</h1>
        <p class="text-muted-foreground">Track your progress and continue where you left off.</p>
      </div>
      <RouterLink to="/courses">
        <Button variant="outline">
          <BookOpen class="mr-2 h-4 w-4" />
          Browse Courses
        </Button>
      </RouterLink>
    </div>

    <!-- Loading State for Stats -->
    <div v-if="isLoading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card v-for="i in 4" :key="i">
        <CardContent class="p-6">
          <Skeleton class="h-4 w-24" />
          <Skeleton class="mt-2 h-8 w-16" />
        </CardContent>
      </Card>
    </div>

    <!-- Stats Cards -->
    <div v-else-if="stats" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent class="flex items-center gap-4 p-6">
          <div class="rounded-full bg-blue-100 p-3">
            <PlayCircle class="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats.inProgressCourses }}</p>
            <p class="text-sm text-muted-foreground">In Progress</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="flex items-center gap-4 p-6">
          <div class="rounded-full bg-green-100 p-3">
            <GraduationCap class="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats.completedCourses }}</p>
            <p class="text-sm text-muted-foreground">Completed</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="flex items-center gap-4 p-6">
          <div class="rounded-full bg-purple-100 p-3">
            <Clock class="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ formatDuration(stats.totalLearningTime) }}</p>
            <p class="text-sm text-muted-foreground">Total Time</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="flex items-center gap-4 p-6">
          <div class="rounded-full bg-orange-100 p-3">
            <Flame class="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats.currentStreak }} days</p>
            <p class="text-sm text-muted-foreground">Current Streak</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Filters -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center rounded-lg border p-1">
        <Button
          v-for="option in filterOptions"
          :key="option.value"
          :variant="filter === option.value ? 'secondary' : 'ghost'"
          size="sm"
          class="h-8"
          @click="setFilter(option.value)"
        >
          {{ option.label }}
          <span
            v-if="option.value === 'in-progress'"
            class="ml-1 rounded-full bg-muted px-1.5 text-xs"
          >
            {{ inProgressCourses.length }}
          </span>
          <span
            v-else-if="option.value === 'completed'"
            class="ml-1 rounded-full bg-muted px-1.5 text-xs"
          >
            {{ completedCourses.length }}
          </span>
        </Button>
      </div>

      <select
        :value="sortBy"
        class="h-9 rounded-md border bg-background px-3 text-sm"
        @change="setSortBy(($event.target as HTMLSelectElement).value as ProgressSortBy)"
      >
        <option v-for="option in sortOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <!-- Error State -->
    <Card v-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">Failed to load progress</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchProgress">Retry</Button>
      </CardContent>
    </Card>

    <!-- Loading State for Courses -->
    <div v-else-if="isLoading" class="space-y-4">
      <Card v-for="i in 3" :key="i">
        <CardContent class="p-4">
          <div class="flex gap-4">
            <Skeleton class="h-24 w-24 shrink-0" />
            <div class="flex-1 space-y-2">
              <Skeleton class="h-5 w-3/4" />
              <Skeleton class="h-4 w-32" />
              <Skeleton class="h-2 w-full" />
              <Skeleton class="h-4 w-48" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Empty State -->
    <Card v-else-if="courses.length === 0">
      <CardContent class="flex flex-col items-center justify-center py-12 text-center">
        <BookOpen class="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 class="mb-2 text-lg font-semibold">
          {{
            filter === 'completed'
              ? 'No completed courses yet'
              : filter === 'in-progress'
                ? 'No courses in progress'
                : 'No enrolled courses yet'
          }}
        </h3>
        <p class="mb-4 text-muted-foreground">
          {{
            filter === 'all'
              ? 'Start your learning journey by enrolling in a course.'
              : 'Keep learning to see courses here!'
          }}
        </p>
        <RouterLink to="/courses">
          <Button>
            Browse Courses
            <ArrowRight class="ml-2 h-4 w-4" />
          </Button>
        </RouterLink>
      </CardContent>
    </Card>

    <!-- Course List -->
    <div v-else class="space-y-4">
      <ProgressCard v-for="course in courses" :key="course.id" :course="course" />
    </div>
  </div>
</template>

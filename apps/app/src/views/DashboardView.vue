<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Trophy,
  GraduationCap,
  Clock,
  ArrowRight,
  PlayCircle,
  Loader2,
  AlertCircle,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useDashboard } from '@/composables/useDashboard';

const authStore = useAuthStore();
const {
  isLoading,
  error,
  stats,
  inProgressCourses,
  recentBadges,
  formattedLearningTime,
  hasInProgressCourses,
  fetchDashboard,
  formatRelativeTime,
} = useDashboard();

onMounted(() => {
  fetchDashboard();
});

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getProgressColor(progress: number): string {
  if (progress >= 75) return 'bg-green-500';
  if (progress >= 50) return 'bg-blue-500';
  if (progress >= 25) return 'bg-yellow-500';
  return 'bg-gray-400';
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight">
        {{ getGreeting() }}, {{ authStore.user?.firstName || 'Learner' }}
      </h1>
      <p class="text-muted-foreground">Here's an overview of your learning progress.</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

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
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Enrolled Courses</CardTitle>
            <BookOpen class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.enrolledCourses }}</div>
            <p class="text-xs text-muted-foreground">
              {{ stats.inProgressCourses }} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Completed</CardTitle>
            <GraduationCap class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.completedCourses }}</div>
            <p class="text-xs text-muted-foreground">Courses finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Badges Earned</CardTitle>
            <Trophy class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.totalBadges }}</div>
            <p class="text-xs text-muted-foreground">Achievements unlocked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Learning Time</CardTitle>
            <Clock class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ formattedLearningTime }}</div>
            <p class="text-xs text-muted-foreground">Total time spent</p>
          </CardContent>
        </Card>
      </div>

      <!-- Continue Learning Section -->
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle>Continue Learning</CardTitle>
              <CardDescription>Pick up where you left off</CardDescription>
            </div>
            <RouterLink v-if="hasInProgressCourses" to="/learning">
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
            v-if="!hasInProgressCourses"
            class="flex flex-col items-center justify-center py-8 text-center"
          >
            <BookOpen class="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 class="mb-2 text-lg font-semibold">No courses yet</h3>
            <p class="mb-4 text-muted-foreground">
              Start exploring our catalog to find courses that interest you.
            </p>
            <RouterLink to="/courses">
              <Button>
                Browse Courses
                <ArrowRight class="ml-2 h-4 w-4" />
              </Button>
            </RouterLink>
          </div>

          <!-- Course List -->
          <div v-else class="space-y-4">
            <div
              v-for="course in inProgressCourses"
              :key="course.id"
              class="group flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <!-- Thumbnail placeholder -->
              <div
                class="flex h-16 w-24 shrink-0 items-center justify-center rounded-md bg-muted"
              >
                <PlayCircle class="h-8 w-8 text-muted-foreground" />
              </div>

              <!-- Course info -->
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <h4 class="truncate font-medium">{{ course.title }}</h4>
                    <p class="text-sm text-muted-foreground">{{ course.instructorName }}</p>
                  </div>
                  <span class="shrink-0 text-xs text-muted-foreground">
                    {{ formatRelativeTime(course.lastAccessedAt) }}
                  </span>
                </div>

                <!-- Progress bar -->
                <div class="mt-2 flex items-center gap-2">
                  <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      :class="getProgressColor(course.progress ?? 0)"
                      class="h-full transition-all"
                      :style="{ width: `${course.progress ?? 0}%` }"
                    />
                  </div>
                  <span class="text-xs font-medium">{{ course.progress ?? 0 }}%</span>
                </div>

                <!-- Next lesson -->
                <p class="mt-1 text-xs text-muted-foreground">
                  Next: {{ course.nextLessonTitle }}
                </p>
              </div>

              <!-- Continue button -->
              <RouterLink :to="`/courses/${course.slug}`" class="shrink-0">
                <Button size="sm" class="opacity-0 transition-opacity group-hover:opacity-100">
                  Continue
                </Button>
              </RouterLink>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Recent Badges Section -->
      <Card v-if="recentBadges.length > 0">
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle>Recent Achievements</CardTitle>
              <CardDescription>Badges you've earned recently</CardDescription>
            </div>
            <RouterLink to="/profile#badges">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight class="ml-1 h-4 w-4" />
              </Button>
            </RouterLink>
          </div>
        </CardHeader>
        <CardContent>
          <div class="flex flex-wrap gap-4">
            <div
              v-for="badge in recentBadges"
              :key="badge.id"
              class="flex items-center gap-3 rounded-lg border p-3"
            >
              <!-- Badge icon placeholder -->
              <div
                class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500"
              >
                <Trophy class="h-6 w-6 text-white" />
              </div>
              <div>
                <p class="font-medium">{{ badge.name }}</p>
                <p class="text-xs text-muted-foreground">{{ badge.description }}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>

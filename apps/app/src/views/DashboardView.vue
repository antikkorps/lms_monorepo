<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Trophy,
  GraduationCap,
  Clock,
  ArrowRight,
  PlayCircle,
  AlertCircle,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useDashboard } from '@/composables/useDashboard';
import { DashboardSkeleton } from '@/components/skeletons';
import { BadgeCard, BadgeModal } from '@/components/badges';
import type { Badge } from '@/composables/useBadges';

const { t } = useI18n();
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

const selectedBadge = ref<Badge | null>(null);
const badgeModalOpen = ref(false);

// Transform API badges to match BadgeCard's expected Badge type
const displayBadges = computed((): Badge[] => {
  return recentBadges.value.map((badge) => ({
    id: badge.id,
    name: badge.name,
    description: badge.description,
    imageUrl: badge.imageUrl,
    category: 'milestone' as const, // Default category for earned badges
    rarity: 'common' as const, // Default rarity
    earnedAt: badge.earnedAt,
  }));
});

function handleBadgeClick(badge: Badge) {
  selectedBadge.value = badge;
  badgeModalOpen.value = true;
}

function formatLastAccessed(date: Date | null): string {
  if (!date) return t('common.dashboard.continueLearning.notStarted', 'Not started');
  return formatRelativeTime(date);
}

onMounted(() => {
  fetchDashboard();
});

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('common.dashboard.greeting.morning');
  if (hour < 18) return t('common.dashboard.greeting.afternoon');
  return t('common.dashboard.greeting.evening');
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
      <p class="text-muted-foreground">{{ t('common.dashboard.subtitle') }}</p>
    </div>

    <!-- Loading State -->
    <DashboardSkeleton v-if="isLoading" />

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">{{ t('common.dashboard.error.title') }}</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchDashboard">
          {{ t('common.dashboard.error.retry') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Dashboard Content -->
    <template v-else-if="stats">
      <!-- Stats Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('common.dashboard.stats.enrolledCourses') }}</CardTitle>
            <BookOpen class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.enrolledCourses }}</div>
            <p class="text-xs text-muted-foreground">
              {{ t('common.dashboard.stats.inProgress', { count: stats.inProgressCourses }) }}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('common.dashboard.stats.completed') }}</CardTitle>
            <GraduationCap class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.completedCourses }}</div>
            <p class="text-xs text-muted-foreground">{{ t('common.dashboard.stats.coursesFinished') }}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('common.dashboard.stats.badgesEarned') }}</CardTitle>
            <Trophy class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.totalBadges }}</div>
            <p class="text-xs text-muted-foreground">{{ t('common.dashboard.stats.achievementsUnlocked') }}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('common.dashboard.stats.learningTime') }}</CardTitle>
            <Clock class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ formattedLearningTime }}</div>
            <p class="text-xs text-muted-foreground">{{ t('common.dashboard.stats.totalTimeSpent') }}</p>
          </CardContent>
        </Card>
      </div>

      <!-- Continue Learning Section -->
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle>{{ t('common.dashboard.continueLearning.title') }}</CardTitle>
              <CardDescription>{{ t('common.dashboard.continueLearning.subtitle') }}</CardDescription>
            </div>
            <RouterLink v-if="hasInProgressCourses" to="/learning">
              <Button variant="ghost" size="sm">
                {{ t('common.actions.viewAll') }}
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
            <h3 class="mb-2 text-lg font-semibold">{{ t('common.dashboard.empty.title') }}</h3>
            <p class="mb-4 text-muted-foreground">
              {{ t('common.dashboard.empty.message') }}
            </p>
            <RouterLink to="/courses">
              <Button>
                {{ t('common.dashboard.empty.action') }}
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
                    {{ formatLastAccessed(course.lastAccessedAt) }}
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
                  {{ t('common.dashboard.continueLearning.next') }} {{ course.nextLessonTitle }}
                </p>
              </div>

              <!-- Continue button -->
              <RouterLink :to="`/courses/${course.slug}`" class="shrink-0">
                <Button size="sm" class="opacity-0 transition-opacity group-hover:opacity-100">
                  {{ t('common.dashboard.continueLearning.continue') }}
                </Button>
              </RouterLink>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Recent Badges Section -->
      <Card v-if="displayBadges.length > 0">
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle>{{ t('common.dashboard.recentAchievements.title') }}</CardTitle>
              <CardDescription>{{ t('common.dashboard.recentAchievements.subtitle') }}</CardDescription>
            </div>
            <RouterLink to="/badges">
              <Button variant="ghost" size="sm">
                {{ t('common.actions.viewAll') }}
                <ArrowRight class="ml-1 h-4 w-4" />
              </Button>
            </RouterLink>
          </div>
        </CardHeader>
        <CardContent>
          <div class="flex flex-wrap gap-6">
            <BadgeCard
              v-for="badge in displayBadges"
              :key="badge.id"
              :badge="badge"
              size="md"
              @click="handleBadgeClick"
            />
          </div>
        </CardContent>
      </Card>
    </template>

    <!-- Badge Modal -->
    <BadgeModal v-model:open="badgeModalOpen" :badge="selectedBadge" />
  </div>
</template>

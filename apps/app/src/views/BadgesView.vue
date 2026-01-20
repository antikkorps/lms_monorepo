<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Filter, AlertCircle } from 'lucide-vue-next';
import { useBadges, type Badge, type BadgeCategory } from '@/composables/useBadges';
import { BadgeGrid, BadgeModal } from '@/components/badges';
import { Skeleton } from '@/components/ui/skeleton';

const {
  isLoading,
  error,
  badges,
  stats,
  filterCategory,
  showLocked,
  fetchBadges,
  setFilterCategory,
  toggleShowLocked,
} = useBadges();

const selectedBadge = ref<Badge | null>(null);
const badgeModalOpen = ref(false);

const categories: { value: BadgeCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'course', label: 'Courses' },
  { value: 'streak', label: 'Streaks' },
  { value: 'quiz', label: 'Quizzes' },
  { value: 'milestone', label: 'Milestones' },
  { value: 'special', label: 'Special' },
];

const progressPercentage = computed(() => {
  if (!stats.value.total) return 0;
  return Math.round((stats.value.earned / stats.value.total) * 100);
});

function handleBadgeSelect(badge: Badge) {
  selectedBadge.value = badge;
  badgeModalOpen.value = true;
}

onMounted(() => {
  fetchBadges();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Achievements</h1>
        <p class="text-muted-foreground">Track your progress and unlock badges</p>
      </div>
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
      <!-- Grid skeleton -->
      <Card>
        <CardHeader>
          <Skeleton class="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            <div v-for="n in 12" :key="n" class="flex flex-col items-center gap-2">
              <Skeleton class="h-16 w-16 rounded-full" />
              <Skeleton class="h-4 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    </template>

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">Failed to load badges</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchBadges">Retry</Button>
      </CardContent>
    </Card>

    <!-- Content -->
    <template v-else>
      <!-- Stats Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Total Progress</CardTitle>
            <Trophy class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ progressPercentage }}%</div>
            <div class="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div
                class="h-full bg-primary rounded-full transition-all"
                :style="{ width: `${progressPercentage}%` }"
              />
            </div>
            <p class="text-xs text-muted-foreground mt-1">
              {{ stats.earned }} of {{ stats.total }} badges earned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Course Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.byCategory.course.earned }}</div>
            <p class="text-xs text-muted-foreground">
              of {{ stats.byCategory.course.total }} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Quiz Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.byCategory.quiz.earned }}</div>
            <p class="text-xs text-muted-foreground">
              of {{ stats.byCategory.quiz.total }} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Streak Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.byCategory.streak.earned }}</div>
            <p class="text-xs text-muted-foreground">
              of {{ stats.byCategory.streak.total }} available
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Badges Grid -->
      <Card>
        <CardHeader>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Your Badges</CardTitle>
              <CardDescription>Click on a badge to see details</CardDescription>
            </div>

            <!-- Filters -->
            <div class="flex flex-wrap items-center gap-2">
              <!-- Category filter -->
              <div class="flex items-center gap-1 rounded-lg border p-1">
                <button
                  v-for="cat in categories"
                  :key="cat.value"
                  class="px-3 py-1 text-sm rounded-md transition-colors"
                  :class="
                    filterCategory === cat.value
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  "
                  @click="setFilterCategory(cat.value)"
                >
                  {{ cat.label }}
                </button>
              </div>

              <!-- Show locked toggle -->
              <Button
                variant="outline"
                size="sm"
                :class="{ 'bg-muted': showLocked }"
                @click="toggleShowLocked"
              >
                <Filter class="h-4 w-4 mr-1" />
                {{ showLocked ? 'Hide Locked' : 'Show Locked' }}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <!-- Empty State -->
          <div
            v-if="badges.length === 0"
            class="flex flex-col items-center justify-center py-12 text-center"
          >
            <Trophy class="h-12 w-12 text-muted-foreground mb-4" />
            <h3 class="text-lg font-semibold mb-2">No badges found</h3>
            <p class="text-muted-foreground">
              {{ filterCategory !== 'all' ? 'Try a different category filter.' : 'Start learning to earn your first badge!' }}
            </p>
          </div>

          <!-- Badge Grid -->
          <BadgeGrid v-else :badges="badges" size="md" @select="handleBadgeSelect" />
        </CardContent>
      </Card>
    </template>

    <!-- Badge Modal -->
    <BadgeModal v-model:open="badgeModalOpen" :badge="selectedBadge" />
  </div>
</template>

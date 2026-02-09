<script setup lang="ts">
import { onMounted, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Trophy } from 'lucide-vue-next';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable.vue';
import { useLeaderboard } from '@/composables/useLeaderboard';

const { t } = useI18n();

const {
  entries,
  pagination,
  myRank,
  isLoading,
  error,
  selectedMetric,
  selectedPeriod,
  selectedScope,
  fetchLeaderboard,
  fetchMyRank,
} = useLeaderboard();

const metrics = computed(() => [
  { value: 'courses_completed', label: t('leaderboard.metrics.courses_completed') },
  { value: 'avg_quiz_score', label: t('leaderboard.metrics.avg_quiz_score') },
  { value: 'current_streak', label: t('leaderboard.metrics.current_streak') },
  { value: 'total_learning_time', label: t('leaderboard.metrics.total_learning_time') },
]);

const periods = computed(() => [
  { value: 'weekly', label: t('leaderboard.periods.weekly') },
  { value: 'monthly', label: t('leaderboard.periods.monthly') },
  { value: 'all_time', label: t('leaderboard.periods.all_time') },
]);

onMounted(() => {
  fetchLeaderboard();
  fetchMyRank();
});

watch([selectedMetric, selectedPeriod, selectedScope], () => {
  fetchLeaderboard();
  fetchMyRank();
});

function loadPage(page: number) {
  fetchLeaderboard(page);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight">{{ t('leaderboard.title') }}</h1>
      <p class="text-muted-foreground">{{ t('leaderboard.subtitle') }}</p>
    </div>

    <!-- My Rank Card -->
    <Card v-if="myRank">
      <CardContent class="flex items-center gap-4 py-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Trophy class="h-6 w-6 text-primary" />
        </div>
        <div>
          <p class="text-lg font-bold">{{ t('leaderboard.myRank', { rank: myRank.rank }) }}</p>
          <p class="text-sm text-muted-foreground">{{ t('leaderboard.yourPosition') }}</p>
        </div>
      </CardContent>
    </Card>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <!-- Metric tabs -->
      <div class="flex rounded-lg border p-1">
        <button
          v-for="m in metrics"
          :key="m.value"
          :class="[
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            selectedMetric === m.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="selectedMetric = m.value"
        >
          {{ m.label }}
        </button>
      </div>

      <!-- Period selector -->
      <div class="flex rounded-lg border p-1">
        <button
          v-for="p in periods"
          :key="p.value"
          :class="[
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            selectedPeriod === p.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="selectedPeriod = p.value"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Error -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">{{ t('leaderboard.error.loadFailed') }}</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchLeaderboard()">
          {{ t('leaderboard.error.retry') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Leaderboard Table -->
    <Card v-else>
      <CardContent class="p-0">
        <LeaderboardTable :entries="entries" :metric="selectedMetric" />
      </CardContent>
    </Card>

    <!-- Pagination -->
    <div v-if="pagination && pagination.totalPages > 1" class="flex justify-center gap-2">
      <Button
        v-for="page in pagination.totalPages"
        :key="page"
        size="sm"
        :variant="page === pagination.page ? 'default' : 'outline'"
        @click="loadPage(page)"
      >
        {{ page }}
      </Button>
    </div>
  </div>
</template>

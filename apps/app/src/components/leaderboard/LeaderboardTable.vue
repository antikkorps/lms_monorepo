<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Trophy } from 'lucide-vue-next';
import type { LeaderboardEntryData } from '@/composables/useLeaderboard';
import { useAuthStore } from '@/stores/auth';

defineProps<{
  entries: LeaderboardEntryData[];
  metric: string;
}>();

const { t } = useI18n();
const authStore = useAuthStore();

function getMedalClass(rank: number): string {
  switch (rank) {
    case 1:
      return 'text-yellow-500';
    case 2:
      return 'text-gray-400';
    case 3:
      return 'text-amber-600';
    default:
      return 'text-muted-foreground';
  }
}

function formatScore(score: number, metric: string): string {
  switch (metric) {
    case 'avg_quiz_score':
      return `${score.toFixed(1)}%`;
    case 'total_learning_time': {
      const hours = Math.floor(score / 3600);
      const minutes = Math.floor((score % 3600) / 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
    case 'current_streak':
      return `${score} ${t('streaks.day', score)}`;
    default:
      return String(score);
  }
}

function getInitials(user: { firstName: string; lastName: string }): string {
  return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
}
</script>

<template>
  <div class="space-y-1">
    <div
      v-for="entry in entries"
      :key="entry.rank"
      :class="[
        'flex items-center gap-4 rounded-lg px-4 py-3 transition-colors',
        entry.user?.id === authStore.user?.id
          ? 'bg-primary/5 border border-primary/20'
          : 'hover:bg-muted/50',
      ]"
    >
      <!-- Rank -->
      <div class="flex w-8 shrink-0 items-center justify-center">
        <Trophy
          v-if="entry.rank <= 3"
          :class="['h-5 w-5', getMedalClass(entry.rank)]"
        />
        <span v-else class="text-sm font-medium text-muted-foreground">
          {{ entry.rank }}
        </span>
      </div>

      <!-- Avatar -->
      <div class="shrink-0">
        <div
          v-if="entry.user?.avatarUrl"
          class="h-8 w-8 rounded-full overflow-hidden"
        >
          <img
            :src="entry.user.avatarUrl"
            :alt="`${entry.user.firstName} ${entry.user.lastName}`"
            class="h-full w-full object-cover"
          />
        </div>
        <div
          v-else-if="entry.user"
          class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium"
        >
          {{ getInitials(entry.user) }}
        </div>
      </div>

      <!-- Name -->
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium">
          {{ entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : t('leaderboard.unknown') }}
          <span
            v-if="entry.user?.id === authStore.user?.id"
            class="ml-1 text-xs text-primary"
          >{{ t('leaderboard.you') }}</span>
        </p>
      </div>

      <!-- Score -->
      <div class="shrink-0 text-sm font-semibold">
        {{ formatScore(entry.score, metric) }}
      </div>
    </div>

    <div
      v-if="entries.length === 0"
      class="flex flex-col items-center justify-center py-12 text-center"
    >
      <Trophy class="mb-4 h-12 w-12 text-muted-foreground" />
      <p class="text-muted-foreground">{{ t('leaderboard.empty') }}</p>
    </div>
  </div>
</template>

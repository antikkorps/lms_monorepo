<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Flame } from 'lucide-vue-next';
import { useStreak } from '@/composables/useStreak';

const { t } = useI18n();
const { streak, isLoading, fetchStreak } = useStreak();

onMounted(() => {
  fetchStreak();
});
</script>

<template>
  <div
    v-if="!isLoading && streak && streak.currentStreak > 0"
    class="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1.5 text-sm font-medium text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
  >
    <Flame class="h-4 w-4" />
    <span>{{ streak.currentStreak }} {{ t('streaks.day', streak.currentStreak) }}</span>
  </div>
</template>

import { ref } from 'vue';
import { useApi } from './useApi';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

export function useStreak() {
  const api = useApi();
  const streak = ref<StreakData | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchStreak() {
    isLoading.value = true;
    error.value = null;
    try {
      streak.value = await api.get<StreakData>('/streaks/me');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load streak';
    } finally {
      isLoading.value = false;
    }
  }

  return {
    streak,
    isLoading,
    error,
    fetchStreak,
  };
}

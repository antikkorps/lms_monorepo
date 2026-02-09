import { ref } from 'vue';
import { useApi } from './useApi';

export interface LeaderboardEntryData {
  rank: number;
  score: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
}

export interface LeaderboardMeta {
  metric: string;
  period: string;
  scope: string;
  periodStart: string;
}

interface LeaderboardPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntryData[];
  pagination: LeaderboardPagination;
  meta: LeaderboardMeta;
}

interface MyRankResponse {
  rank: number;
  score: number;
}

export function useLeaderboard() {
  const api = useApi();
  const entries = ref<LeaderboardEntryData[]>([]);
  const pagination = ref<LeaderboardPagination | null>(null);
  const meta = ref<LeaderboardMeta | null>(null);
  const myRank = ref<MyRankResponse | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const selectedMetric = ref<string>('courses_completed');
  const selectedPeriod = ref<string>('all_time');
  const selectedScope = ref<string>('global');

  async function fetchLeaderboard(page = 1) {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await api.get<LeaderboardResponse>('/leaderboards', {
        metric: selectedMetric.value,
        period: selectedPeriod.value,
        scope: selectedScope.value,
        page,
        limit: 20,
      });
      entries.value = result.entries || [];
      pagination.value = result.pagination || null;
      meta.value = result.meta || null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load leaderboard';
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchMyRank() {
    try {
      myRank.value = await api.get<MyRankResponse | null>('/leaderboards/me', {
        metric: selectedMetric.value,
        period: selectedPeriod.value,
        scope: selectedScope.value,
      });
    } catch {
      myRank.value = null;
    }
  }

  return {
    entries,
    pagination,
    meta,
    myRank,
    isLoading,
    error,
    selectedMetric,
    selectedPeriod,
    selectedScope,
    fetchLeaderboard,
    fetchMyRank,
  };
}

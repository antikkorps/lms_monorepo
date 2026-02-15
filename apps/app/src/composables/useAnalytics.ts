/**
 * Analytics Composable
 * Manages learning analytics data for charts and statistics
 */

import { ref, computed } from 'vue';
import { useApi } from './useApi';

export interface DailyActivity {
  date: string;
  lessonsCompleted: number;
  minutesSpent: number;
  quizzesTaken: number;
}

export interface CourseProgress {
  courseId: string;
  courseName: string;
  progress: number;
  lessonsCompleted: number;
  totalLessons: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface WeeklyStreak {
  week: string;
  daysActive: number;
  totalMinutes: number;
}

export interface AnalyticsData {
  dailyActivity: DailyActivity[];
  courseProgress: CourseProgress[];
  categoryDistribution: CategoryDistribution[];
  weeklyStreaks: WeeklyStreak[];
  summary: {
    totalCourses: number;
    completedCourses: number;
    totalLessons: number;
    completedLessons: number;
    totalMinutes: number;
    averageQuizScore: number;
    currentStreak: number;
    longestStreak: number;
  };
}

export function useAnalytics() {
  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const data = ref<AnalyticsData | null>(null);

  const dailyActivity = computed(() => data.value?.dailyActivity || []);
  const courseProgress = computed(() => data.value?.courseProgress || []);
  const categoryDistribution = computed(() => data.value?.categoryDistribution || []);
  const weeklyStreaks = computed(() => data.value?.weeklyStreaks || []);
  const summary = computed(() => data.value?.summary);

  // Chart data formatters
  const activityChartData = computed(() => {
    const activity = dailyActivity.value;
    return {
      labels: activity.map((d) => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Minutes Spent',
          data: activity.map((d) => d.minutesSpent),
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  });

  const lessonsChartData = computed(() => {
    const activity = dailyActivity.value;
    return {
      labels: activity.map((d) => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Lessons Completed',
          data: activity.map((d) => d.lessonsCompleted),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderRadius: 4,
        },
      ],
    };
  });

  const progressChartData = computed(() => {
    const progress = courseProgress.value;
    return {
      labels: progress.map((c) => c.courseName),
      datasets: [
        {
          label: 'Progress',
          data: progress.map((c) => c.progress),
          backgroundColor: [
            'rgba(99, 102, 241, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(251, 146, 60, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(168, 85, 247, 0.8)',
          ],
          borderRadius: 4,
        },
      ],
    };
  });

  const categoryChartData = computed(() => {
    const distribution = categoryDistribution.value;
    return {
      labels: distribution.map((c) => c.category),
      datasets: [
        {
          data: distribution.map((c) => c.count),
          backgroundColor: [
            'rgba(99, 102, 241, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(251, 146, 60, 0.8)',
            'rgba(236, 72, 153, 0.8)',
          ],
          borderWidth: 0,
        },
      ],
    };
  });

  const streakChartData = computed(() => {
    const streaks = weeklyStreaks.value;
    return {
      labels: streaks.map((s) => s.week),
      datasets: [
        {
          label: 'Days Active',
          data: streaks.map((s) => s.daysActive),
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
          borderRadius: 4,
        },
      ],
    };
  });

  async function fetchAnalytics(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const api = useApi();
      const response = await api.get<AnalyticsData>('/learner/analytics');
      data.value = response;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load analytics';
    } finally {
      isLoading.value = false;
    }
  }

  function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  return {
    // State
    isLoading,
    error,
    data,

    // Computed
    dailyActivity,
    courseProgress,
    categoryDistribution,
    weeklyStreaks,
    summary,

    // Chart data
    activityChartData,
    lessonsChartData,
    progressChartData,
    categoryChartData,
    streakChartData,

    // Methods
    fetchAnalytics,
    formatMinutes,
  };
}

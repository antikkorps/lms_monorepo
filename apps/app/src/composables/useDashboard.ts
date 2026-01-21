/**
 * Dashboard Composable
 * Handles learner dashboard data fetching and state
 */

import type { LearnerDashboardStats, CourseListItem, Badge } from '@shared/types';
import { ref, computed } from 'vue';
import { useApi } from './useApi';

// Extended course type for dashboard with last accessed info
export interface DashboardCourse extends CourseListItem {
  lastAccessedAt: Date;
  nextLessonTitle: string;
}

interface DashboardData {
  stats: LearnerDashboardStats;
  inProgressCourses: DashboardCourse[];
  recentBadges: Badge[];
}

// Mock data for development (will be replaced by API calls)
const mockData: DashboardData = {
  stats: {
    enrolledCourses: 5,
    completedCourses: 2,
    inProgressCourses: 3,
    totalBadges: 7,
    totalLearningTime: 1847, // minutes
  },
  inProgressCourses: [
    {
      id: '1',
      title: 'Introduction to Machine Learning',
      slug: 'intro-ml',
      description: 'Learn the fundamentals of ML',
      thumbnailUrl: null,
      instructorName: 'Dr. Sarah Chen',
      price: 0,
      duration: 480,
      chaptersCount: 8,
      lessonsCount: 32,
      progress: 65,
      lastAccessedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
      nextLessonTitle: 'Neural Networks Basics',
    },
    {
      id: '2',
      title: 'Advanced TypeScript Patterns',
      slug: 'advanced-typescript',
      description: 'Master TypeScript like a pro',
      thumbnailUrl: null,
      instructorName: 'Mike Johnson',
      price: 0,
      duration: 360,
      chaptersCount: 6,
      lessonsCount: 24,
      progress: 42,
      lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      nextLessonTitle: 'Generic Constraints',
    },
    {
      id: '3',
      title: 'Vue 3 Composition API Mastery',
      slug: 'vue3-composition',
      description: 'Deep dive into Vue 3',
      thumbnailUrl: null,
      instructorName: 'Emma Wilson',
      price: 0,
      duration: 300,
      chaptersCount: 5,
      lessonsCount: 20,
      progress: 15,
      lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      nextLessonTitle: 'Reactive References',
    },
  ],
  recentBadges: [
    {
      id: '1',
      name: 'Quick Learner',
      description: 'Complete 5 lessons in one day',
      imageUrl: '/badges/quick-learner.svg',
      earnedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
    {
      id: '2',
      name: 'First Course',
      description: 'Complete your first course',
      imageUrl: '/badges/first-course.svg',
      earnedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
    {
      id: '3',
      name: 'Perfect Score',
      description: 'Get 100% on a quiz',
      imageUrl: '/badges/perfect-score.svg',
      earnedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    },
  ],
};

export function useDashboard() {
  const api = useApi();

  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const stats = ref<LearnerDashboardStats | null>(null);
  const inProgressCourses = ref<DashboardCourse[]>([]);
  const recentBadges = ref<Badge[]>([]);

  // Computed helpers
  const formattedLearningTime = computed(() => {
    if (!stats.value) return '0h';
    const minutes = stats.value.totalLearningTime;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  });

  const hasInProgressCourses = computed(() => inProgressCourses.value.length > 0);

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  /**
   * Fetch dashboard data from API
   */
  async function fetchDashboard(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      // TODO: Replace with real API calls when endpoints are ready
      // const data = await api.get<DashboardData>('/learner/dashboard');

      // Using mock data for now
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
      stats.value = mockData.stats;
      inProgressCourses.value = mockData.inProgressCourses;
      recentBadges.value = mockData.recentBadges;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load dashboard';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Refresh dashboard data
   */
  async function refresh(): Promise<void> {
    await fetchDashboard();
  }

  return {
    // State
    isLoading,
    error,
    stats,
    inProgressCourses,
    recentBadges,

    // Computed
    formattedLearningTime,
    hasInProgressCourses,

    // Methods
    fetchDashboard,
    refresh,
    formatRelativeTime,
  };
}

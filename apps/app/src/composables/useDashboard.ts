/**
 * Dashboard Composable
 * Handles learner dashboard data fetching with real API integration
 */

import type { LearnerDashboardStats, CourseListItem, Badge } from '@shared/types';
import { ref, computed } from 'vue';
import { useApi } from './useApi';

// Extended course type for dashboard with last accessed info
export interface DashboardCourse extends CourseListItem {
  lastAccessedAt: Date | null;
  nextLessonTitle: string | null;
}

interface ApiDashboardCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  instructorName: string;
  price: number;
  currency: string;
  duration: number;
  chaptersCount: number;
  lessonsCount: number;
  progress: number;
  lastAccessedAt: string | null;
  nextLessonTitle: string | null;
}

interface ApiBadge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  earnedAt: string;
  courseId?: string;
}

interface ApiDashboardData {
  stats: LearnerDashboardStats;
  inProgressCourses: ApiDashboardCourse[];
  recentBadges: ApiBadge[];
}

function transformCourse(course: ApiDashboardCourse): DashboardCourse {
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl,
    instructorName: course.instructorName,
    price: course.price,
    currency: (course.currency as 'EUR' | 'USD') || 'EUR',
    duration: course.duration,
    chaptersCount: course.chaptersCount,
    lessonsCount: course.lessonsCount,
    progress: course.progress,
    lastAccessedAt: course.lastAccessedAt ? new Date(course.lastAccessedAt) : null,
    nextLessonTitle: course.nextLessonTitle,
  };
}

function transformBadge(badge: ApiBadge): Badge {
  return {
    id: badge.id,
    name: badge.name,
    description: badge.description,
    imageUrl: badge.imageUrl,
    earnedAt: new Date(badge.earnedAt),
    courseId: badge.courseId,
  };
}

// Use window to persist state across HMR reloads and prevent duplicate fetches
const WINDOW_KEY = '__dashboardState__';
const FETCH_THROTTLE_MS = 2000;

interface WindowState {
  fetchInProgress: boolean;
  lastFetchTime: number;
}

function getWindowState(): WindowState {
  if (!(window as unknown as Record<string, unknown>)[WINDOW_KEY]) {
    (window as unknown as Record<string, unknown>)[WINDOW_KEY] = {
      fetchInProgress: false,
      lastFetchTime: 0,
    };
  }
  return (window as unknown as Record<string, unknown>)[WINDOW_KEY] as WindowState;
}

// Shared state across all useDashboard() calls
const sharedIsLoading = ref(false);
const sharedError = ref<string | null>(null);
const sharedStats = ref<LearnerDashboardStats | null>(null);
const sharedInProgressCourses = ref<DashboardCourse[]>([]);
const sharedRecentBadges = ref<Badge[]>([]);

export function useDashboard() {
  const api = useApi();

  // Use shared state instead of creating new state per call
  const isLoading = sharedIsLoading;
  const error = sharedError;
  const stats = sharedStats;
  const inProgressCourses = sharedInProgressCourses;
  const recentBadges = sharedRecentBadges;

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
   * Protected against rapid successive calls (HMR, multiple component mounts)
   */
  async function fetchDashboard(): Promise<void> {
    const now = Date.now();
    const windowState = getWindowState();

    // Prevent rapid successive calls
    if (windowState.fetchInProgress || now - windowState.lastFetchTime < FETCH_THROTTLE_MS) {
      console.log('[useDashboard] Skipping fetch - throttled or in progress');
      return;
    }

    windowState.fetchInProgress = true;
    windowState.lastFetchTime = now;
    isLoading.value = true;
    error.value = null;

    try {
      // useApi already unwraps the 'data' property from the API response
      const data = await api.get<ApiDashboardData>('/learner/dashboard');

      stats.value = data.stats;
      inProgressCourses.value = data.inProgressCourses.map(transformCourse);
      recentBadges.value = data.recentBadges.map(transformBadge);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load dashboard';
    } finally {
      isLoading.value = false;
      windowState.fetchInProgress = false;
    }
  }

  /**
   * Refresh dashboard data (forces refresh by resetting throttle)
   */
  async function refresh(): Promise<void> {
    const windowState = getWindowState();
    windowState.lastFetchTime = 0; // Reset throttle to allow immediate fetch
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

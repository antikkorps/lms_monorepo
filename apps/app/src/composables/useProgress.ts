/**
 * Progress Tracking Composable
 * Manages user learning progress across courses
 */

import type { CourseListItem } from '@shared/types';
import { ref, computed } from 'vue';
import { useApi } from './useApi';

export interface CourseProgress extends CourseListItem {
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastAccessedAt: Date;
  completedAt: Date | null;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
  estimatedTimeLeft: number; // minutes
}

export interface ProgressStats {
  totalCourses: number;
  inProgressCourses: number;
  completedCourses: number;
  totalLearningTime: number;
  currentStreak: number;
  longestStreak: number;
}

interface ApiCourseProgress {
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
  completedLessons: number;
  totalLessons: number;
  lastAccessedAt: string | null;
  completedAt: string | null;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
  estimatedTimeLeft: number;
}

interface ApiProgressData {
  courses: ApiCourseProgress[];
  stats: ProgressStats;
}

function transformCourse(course: ApiCourseProgress): CourseProgress {
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
    completedLessons: course.completedLessons,
    totalLessons: course.totalLessons,
    lastAccessedAt: course.lastAccessedAt ? new Date(course.lastAccessedAt) : new Date(),
    completedAt: course.completedAt ? new Date(course.completedAt) : null,
    nextLessonId: course.nextLessonId,
    nextLessonTitle: course.nextLessonTitle,
    estimatedTimeLeft: course.estimatedTimeLeft,
  };
}

export type ProgressFilter = 'all' | 'in-progress' | 'completed';
export type ProgressSortBy = 'recent' | 'progress' | 'title';

// Shared state to prevent duplicate fetches
const WINDOW_KEY = '__progressState__';
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

// Shared state across all useProgress() calls
const sharedIsLoading = ref(false);
const sharedError = ref<string | null>(null);
const sharedCourses = ref<CourseProgress[]>([]);
const sharedStats = ref<ProgressStats | null>(null);

export function useProgress() {
  const api = useApi();

  // Use shared state instead of creating new state per call
  const isLoading = sharedIsLoading;
  const error = sharedError;
  const courses = sharedCourses;
  const stats = sharedStats;
  const filter = ref<ProgressFilter>('all');
  const sortBy = ref<ProgressSortBy>('recent');

  // Filtered and sorted courses
  const filteredCourses = computed(() => {
    let result = [...courses.value];

    // Apply filter
    if (filter.value === 'in-progress') {
      result = result.filter((c) => c.progress < 100);
    } else if (filter.value === 'completed') {
      result = result.filter((c) => c.progress === 100);
    }

    // Apply sort
    switch (sortBy.value) {
      case 'recent':
        result.sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime());
        break;
      case 'progress':
        result.sort((a, b) => b.progress - a.progress);
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  });

  const inProgressCourses = computed(() => courses.value.filter((c) => c.progress < 100));
  const completedCourses = computed(() => courses.value.filter((c) => c.progress === 100));

  /**
   * Format duration in minutes
   */
  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  /**
   * Format relative time
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
   * Get progress color class
   */
  function getProgressColor(progress: number): string {
    if (progress === 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  }

  /**
   * Fetch user progress data from API
   */
  async function fetchProgress(): Promise<void> {
    const now = Date.now();
    const windowState = getWindowState();

    // Prevent rapid successive calls
    if (windowState.fetchInProgress || now - windowState.lastFetchTime < FETCH_THROTTLE_MS) {
      console.log('[useProgress] Skipping fetch - throttled or in progress');
      return;
    }

    windowState.fetchInProgress = true;
    windowState.lastFetchTime = now;
    isLoading.value = true;
    error.value = null;

    try {
      const data = await api.get<ApiProgressData>('/learner/progress');

      courses.value = data.courses.map(transformCourse);
      stats.value = data.stats;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load progress';
    } finally {
      isLoading.value = false;
      windowState.fetchInProgress = false;
    }
  }

  /**
   * Refresh progress data (forces refresh by resetting throttle)
   */
  async function refresh(): Promise<void> {
    const windowState = getWindowState();
    windowState.lastFetchTime = 0;
    await fetchProgress();
  }

  /**
   * Update lesson completion
   */
  async function markLessonComplete(courseId: string, lessonId: string): Promise<boolean> {
    try {
      await api.post(`/courses/${courseId}/lessons/${lessonId}/complete`, {});

      // Update local state
      const course = courses.value.find((c) => c.id === courseId);
      if (course) {
        course.completedLessons++;
        course.progress = Math.round((course.completedLessons / course.totalLessons) * 100);
        course.lastAccessedAt = new Date();

        if (course.progress === 100) {
          course.completedAt = new Date();
        }
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update progress';
      return false;
    }
  }

  function setFilter(newFilter: ProgressFilter) {
    filter.value = newFilter;
  }

  function setSortBy(newSortBy: ProgressSortBy) {
    sortBy.value = newSortBy;
  }

  return {
    // State
    isLoading,
    error,
    courses: filteredCourses,
    allCourses: courses,
    stats,
    filter,
    sortBy,

    // Computed
    inProgressCourses,
    completedCourses,

    // Methods
    fetchProgress,
    refresh,
    markLessonComplete,
    setFilter,
    setSortBy,
    formatDuration,
    formatRelativeTime,
    getProgressColor,
  };
}

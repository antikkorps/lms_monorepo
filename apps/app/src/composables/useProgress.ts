/**
 * Progress Tracking Composable
 * Manages user learning progress across courses
 */

import type { CourseListItem } from '@shared/types';
import { ref, computed } from 'vue';
// import { useApi } from './useApi'; // TODO: Uncomment when API endpoints are ready

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

// Mock data for development
const mockProgressData: CourseProgress[] = [
  {
    id: '1',
    title: 'Introduction to Machine Learning',
    slug: 'intro-ml',
    description: 'Learn the fundamentals of ML',
    thumbnailUrl: null,
    instructorName: 'Dr. Sarah Chen',
    price: 4900,
    duration: 480,
    chaptersCount: 8,
    lessonsCount: 32,
    progress: 65,
    completedLessons: 21,
    totalLessons: 32,
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 30),
    completedAt: null,
    nextLessonId: 'l22',
    nextLessonTitle: 'Neural Networks Basics',
    estimatedTimeLeft: 168,
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
    completedLessons: 10,
    totalLessons: 24,
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    completedAt: null,
    nextLessonId: 'l11',
    nextLessonTitle: 'Generic Constraints',
    estimatedTimeLeft: 209,
  },
  {
    id: '3',
    title: 'Vue 3 Composition API Mastery',
    slug: 'vue3-composition',
    description: 'Deep dive into Vue 3',
    thumbnailUrl: null,
    instructorName: 'Emma Wilson',
    price: 3900,
    duration: 300,
    chaptersCount: 5,
    lessonsCount: 20,
    progress: 100,
    completedLessons: 20,
    totalLessons: 20,
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    nextLessonId: null,
    nextLessonTitle: null,
    estimatedTimeLeft: 0,
  },
  {
    id: '4',
    title: 'Docker & Kubernetes Fundamentals',
    slug: 'docker-kubernetes',
    description: 'Learn containerization and orchestration',
    thumbnailUrl: null,
    instructorName: 'Lisa Park',
    price: 0,
    duration: 420,
    chaptersCount: 7,
    lessonsCount: 28,
    progress: 15,
    completedLessons: 4,
    totalLessons: 28,
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    completedAt: null,
    nextLessonId: 'l5',
    nextLessonTitle: 'Docker Compose',
    estimatedTimeLeft: 357,
  },
];

const mockStats: ProgressStats = {
  totalCourses: 4,
  inProgressCourses: 3,
  completedCourses: 1,
  totalLearningTime: 1847,
  currentStreak: 5,
  longestStreak: 12,
};

export type ProgressFilter = 'all' | 'in-progress' | 'completed';
export type ProgressSortBy = 'recent' | 'progress' | 'title';

export function useProgress() {
  // TODO: Replace mock data with real API calls using useApi()

  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const courses = ref<CourseProgress[]>([]);
  const stats = ref<ProgressStats | null>(null);
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
   * Fetch user progress data
   */
  async function fetchProgress(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      // TODO: Replace with real API call
      // const data = await api.get<{ courses: CourseProgress[], stats: ProgressStats }>('/user/progress');

      await new Promise((resolve) => setTimeout(resolve, 500));
      courses.value = mockProgressData;
      stats.value = mockStats;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load progress';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Update lesson completion
   */
  async function markLessonComplete(courseId: string, _lessonId: string): Promise<boolean> {
    try {
      // TODO: Replace with real API call
      // await api.post(`/courses/${courseId}/lessons/${lessonId}/complete`);

      await new Promise((resolve) => setTimeout(resolve, 300));

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
    markLessonComplete,
    setFilter,
    setSortBy,
    formatDuration,
    formatRelativeTime,
    getProgressColor,
  };
}

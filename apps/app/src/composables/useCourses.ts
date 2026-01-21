/**
 * Courses Composable
 * Handles course listing and filtering
 */

import type { CourseListItem } from '@shared/types';
import { ref, computed } from 'vue';
import { useApi } from './useApi';

export type CourseFilter = 'all' | 'free' | 'paid';
export type CourseSortBy = 'newest' | 'popular' | 'title' | 'duration';

interface CoursesState {
  courses: CourseListItem[];
  isLoading: boolean;
  error: string | null;
  filter: CourseFilter;
  sortBy: CourseSortBy;
  searchQuery: string;
}

// Mock data for development
const mockCourses: CourseListItem[] = [
  {
    id: '1',
    title: 'Introduction to Machine Learning',
    slug: 'intro-ml',
    description:
      'Learn the fundamentals of machine learning, from basic concepts to practical implementations with Python.',
    thumbnailUrl: null,
    instructorName: 'Dr. Sarah Chen',
    price: 4900,
    duration: 480,
    chaptersCount: 8,
    lessonsCount: 32,
  },
  {
    id: '2',
    title: 'Advanced TypeScript Patterns',
    slug: 'advanced-typescript',
    description:
      'Master TypeScript with advanced patterns, generics, and type manipulation techniques.',
    thumbnailUrl: null,
    instructorName: 'Mike Johnson',
    price: 0,
    duration: 360,
    chaptersCount: 6,
    lessonsCount: 24,
  },
  {
    id: '3',
    title: 'Vue 3 Composition API Mastery',
    slug: 'vue3-composition',
    description:
      'Deep dive into Vue 3 Composition API with real-world examples and best practices.',
    thumbnailUrl: null,
    instructorName: 'Emma Wilson',
    price: 3900,
    duration: 300,
    chaptersCount: 5,
    lessonsCount: 20,
  },
  {
    id: '4',
    title: 'Building RESTful APIs with Node.js',
    slug: 'nodejs-rest-api',
    description:
      'Create production-ready REST APIs using Node.js, Express, and PostgreSQL.',
    thumbnailUrl: null,
    instructorName: 'James Brown',
    price: 5900,
    duration: 540,
    chaptersCount: 10,
    lessonsCount: 45,
  },
  {
    id: '5',
    title: 'Docker & Kubernetes Fundamentals',
    slug: 'docker-kubernetes',
    description:
      'Learn containerization and orchestration from scratch with hands-on exercises.',
    thumbnailUrl: null,
    instructorName: 'Lisa Park',
    price: 0,
    duration: 420,
    chaptersCount: 7,
    lessonsCount: 28,
  },
  {
    id: '6',
    title: 'PostgreSQL Performance Optimization',
    slug: 'postgresql-performance',
    description:
      'Optimize your PostgreSQL database for maximum performance and scalability.',
    thumbnailUrl: null,
    instructorName: 'David Lee',
    price: 2900,
    duration: 240,
    chaptersCount: 4,
    lessonsCount: 16,
  },
];

export function useCourses() {
  const api = useApi();

  const state = ref<CoursesState>({
    courses: [],
    isLoading: true,
    error: null,
    filter: 'all',
    sortBy: 'newest',
    searchQuery: '',
  });

  // Filtered and sorted courses
  const filteredCourses = computed(() => {
    let result = [...state.value.courses];

    // Apply search filter
    if (state.value.searchQuery) {
      const query = state.value.searchQuery.toLowerCase();
      result = result.filter(
        (course) =>
          course.title.toLowerCase().includes(query) ||
          course.description?.toLowerCase().includes(query) ||
          course.instructorName.toLowerCase().includes(query)
      );
    }

    // Apply price filter
    if (state.value.filter === 'free') {
      result = result.filter((course) => course.price === 0);
    } else if (state.value.filter === 'paid') {
      result = result.filter((course) => course.price > 0);
    }

    // Apply sorting
    switch (state.value.sortBy) {
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'duration':
        result.sort((a, b) => b.duration - a.duration);
        break;
      case 'popular':
        // In real app, would sort by enrollment count
        break;
      case 'newest':
      default:
        // In real app, would sort by createdAt
        break;
    }

    return result;
  });

  const totalCourses = computed(() => state.value.courses.length);
  const filteredCount = computed(() => filteredCourses.value.length);
  const freeCourses = computed(() => state.value.courses.filter((c) => c.price === 0).length);

  /**
   * Fetch courses from API
   */
  async function fetchCourses(): Promise<void> {
    state.value.isLoading = true;
    state.value.error = null;

    try {
      // TODO: Replace with real API call when endpoint is ready
      // const courses = await api.get<CourseListItem[]>('/courses');

      // Using mock data for now
      await new Promise((resolve) => setTimeout(resolve, 500));
      state.value.courses = mockCourses;
    } catch (err) {
      state.value.error = err instanceof Error ? err.message : 'Failed to load courses';
    } finally {
      state.value.isLoading = false;
    }
  }

  /**
   * Set filter
   */
  function setFilter(filter: CourseFilter): void {
    state.value.filter = filter;
  }

  /**
   * Set sort order
   */
  function setSortBy(sortBy: CourseSortBy): void {
    state.value.sortBy = sortBy;
  }

  /**
   * Set search query
   */
  function setSearchQuery(query: string): void {
    state.value.searchQuery = query;
  }

  /**
   * Clear all filters
   */
  function clearFilters(): void {
    state.value.filter = 'all';
    state.value.sortBy = 'newest';
    state.value.searchQuery = '';
  }

  return {
    // State
    isLoading: computed(() => state.value.isLoading),
    error: computed(() => state.value.error),
    courses: filteredCourses,
    filter: computed(() => state.value.filter),
    sortBy: computed(() => state.value.sortBy),
    searchQuery: computed(() => state.value.searchQuery),

    // Computed
    totalCourses,
    filteredCount,
    freeCourses,

    // Methods
    fetchCourses,
    setFilter,
    setSortBy,
    setSearchQuery,
    clearFilters,
  };
}

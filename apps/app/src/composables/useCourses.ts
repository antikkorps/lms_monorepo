/**
 * Courses Composable
 * Handles course listing and filtering with real API integration
 */

import type { CourseListItem } from '@shared/types';
import { ref, computed } from 'vue';

export type CourseFilter = 'all' | 'free' | 'paid';
export type CourseSortBy = 'newest' | 'popular' | 'title' | 'duration';

interface CoursesState {
  courses: CourseListItem[];
  isLoading: boolean;
  error: string | null;
  filter: CourseFilter;
  sortBy: CourseSortBy;
  searchQuery: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  price: number;
  currency: string;
  duration: number;
  chaptersCount: number;
  lessonsCount: number;
  instructor?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

// Note: The API returns { data: courses[], pagination: {...} }
// But useApi unwraps .data, so we get just courses[] back
// For pagination, we need the raw response
interface CoursesApiRawResponse {
  data: ApiCourse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Transform API course to CourseListItem
 */
function transformCourse(course: ApiCourse): CourseListItem {
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description || '',
    thumbnailUrl: course.thumbnailUrl,
    instructorName: course.instructor
      ? `${course.instructor.firstName} ${course.instructor.lastName}`
      : 'Unknown',
    price: Number(course.price),
    currency: (course.currency as 'EUR' | 'USD') || 'EUR',
    duration: Math.floor(course.duration / 60), // API returns seconds, frontend expects minutes
    chaptersCount: course.chaptersCount,
    lessonsCount: course.lessonsCount,
  };
}

export function useCourses() {
  const state = ref<CoursesState>({
    courses: [],
    isLoading: true,
    error: null,
    filter: 'all',
    sortBy: 'newest',
    searchQuery: '',
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  });

  // Filtered and sorted courses (client-side filtering)
  const filteredCourses = computed(() => {
    let result = [...state.value.courses];

    // Apply search filter (client-side supplement to server search)
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
        // Sort by lessons count as proxy for popularity
        result.sort((a, b) => b.lessonsCount - a.lessonsCount);
        break;
      case 'newest':
      default:
        // Keep API order (newest first by default)
        break;
    }

    return result;
  });

  const totalCourses = computed(() => state.value.pagination.total);
  const filteredCount = computed(() => filteredCourses.value.length);
  const freeCourses = computed(() => state.value.courses.filter((c) => c.price === 0).length);

  /**
   * Fetch courses from API
   * Note: Using fetch directly because we need both data and pagination from the response
   */
  async function fetchCourses(): Promise<void> {
    state.value.isLoading = true;
    state.value.error = null;

    try {
      const params = new URLSearchParams();
      params.set('page', state.value.pagination.page.toString());
      params.set('limit', state.value.pagination.limit.toString());
      params.set('sort', 'createdAt');
      params.set('order', 'DESC');

      // Add search to API call if present
      if (state.value.searchQuery) {
        params.set('search', state.value.searchQuery);
      }

      const response = await fetch(`/api/v1/courses?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const result = (await response.json()) as CoursesApiRawResponse;

      state.value.courses = result.data.map(transformCourse);
      state.value.pagination = result.pagination;
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

  /**
   * Go to a specific page
   */
  function goToPage(page: number): void {
    state.value.pagination.page = page;
    fetchCourses();
  }

  return {
    // State
    isLoading: computed(() => state.value.isLoading),
    error: computed(() => state.value.error),
    courses: filteredCourses,
    filter: computed(() => state.value.filter),
    sortBy: computed(() => state.value.sortBy),
    searchQuery: computed(() => state.value.searchQuery),
    pagination: computed(() => state.value.pagination),

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
    goToPage,
  };
}

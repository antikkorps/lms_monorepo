/**
 * Course Editor Composable
 * Handles instructor course management: CRUD operations and publishing
 */

import type {
  InstructorCourse,
  CreateCourseInput,
  UpdateCourseInput,
  CourseStatus,
} from '@shared/types';
import { ref, computed } from 'vue';
import { useApi } from './useApi';
import { logger } from '../lib/logger';

interface CourseEditorState {
  courses: InstructorCourse[];
  currentCourse: InstructorCourse | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

// Use window to persist state across HMR reloads
const WINDOW_KEY = '__courseEditorState__';
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

// Shared state across all useCourseEditor() calls
const sharedState = ref<CourseEditorState>({
  courses: [],
  currentCourse: null,
  isLoading: false,
  isSaving: false,
  error: null,
});

export function useCourseEditor() {
  const api = useApi();

  // Use shared state instead of creating new state per call
  const state = sharedState;

  // Computed
  const hasCourses = computed(() => state.value.courses.length > 0);
  const draftCourses = computed(() =>
    state.value.courses.filter((c) => c.status === 'draft')
  );
  const publishedCourses = computed(() =>
    state.value.courses.filter((c) => c.status === 'published')
  );
  const archivedCourses = computed(() =>
    state.value.courses.filter((c) => c.status === 'archived')
  );

  /**
   * Fetch all courses for the current instructor
   * Protected against rapid successive calls (HMR, multiple component mounts)
   */
  async function fetchMyCourses(): Promise<void> {
    const now = Date.now();
    const windowState = getWindowState();

    logger.debug('[useCourseEditor] fetchMyCourses called', {
      fetchInProgress: windowState.fetchInProgress,
      lastFetchTime: windowState.lastFetchTime,
      timeSinceLastFetch: now - windowState.lastFetchTime,
      throttleMs: FETCH_THROTTLE_MS,
    });

    // Prevent rapid successive calls
    if (windowState.fetchInProgress || now - windowState.lastFetchTime < FETCH_THROTTLE_MS) {
      logger.debug('[useCourseEditor] Skipping fetch - throttled or in progress');
      return;
    }

    windowState.fetchInProgress = true;
    windowState.lastFetchTime = now;
    state.value.isLoading = true;
    state.value.error = null;

    try {
      logger.debug('[useCourseEditor] Fetching courses...');
      const courses = await api.get<InstructorCourse[]>('/courses/my');
      state.value.courses = courses;
      logger.debug('[useCourseEditor] Fetched', courses.length, 'courses');
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to load courses';
      logger.error('[useCourseEditor] Fetch error:', err);
    } finally {
      state.value.isLoading = false;
      windowState.fetchInProgress = false;
    }
  }

  /**
   * Fetch a single course by ID
   */
  async function fetchCourse(id: string): Promise<InstructorCourse | null> {
    state.value.isLoading = true;
    state.value.error = null;

    try {
      const course = await api.get<InstructorCourse>(`/courses/${id}`);
      state.value.currentCourse = course;
      return course;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to load course';
      return null;
    } finally {
      state.value.isLoading = false;
    }
  }

  /**
   * Create a new course
   */
  async function createCourse(
    input: CreateCourseInput
  ): Promise<InstructorCourse | null> {
    state.value.isSaving = true;
    state.value.error = null;

    try {
      const course = await api.post<InstructorCourse>('/courses', input);
      state.value.courses.unshift(course);
      return course;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to create course';
      return null;
    } finally {
      state.value.isSaving = false;
    }
  }

  /**
   * Update an existing course
   */
  async function updateCourse(
    id: string,
    input: UpdateCourseInput
  ): Promise<InstructorCourse | null> {
    state.value.isSaving = true;
    state.value.error = null;

    try {
      const course = await api.patch<InstructorCourse>(`/courses/${id}`, input);

      // Update in local state
      const index = state.value.courses.findIndex((c) => c.id === id);
      if (index !== -1) {
        state.value.courses[index] = course;
      }
      if (state.value.currentCourse?.id === id) {
        state.value.currentCourse = course;
      }

      return course;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to update course';
      return null;
    } finally {
      state.value.isSaving = false;
    }
  }

  /**
   * Delete a course
   */
  async function deleteCourse(id: string): Promise<boolean> {
    state.value.isSaving = true;
    state.value.error = null;

    try {
      await api.delete(`/courses/${id}`);

      // Remove from local state
      state.value.courses = state.value.courses.filter((c) => c.id !== id);
      if (state.value.currentCourse?.id === id) {
        state.value.currentCourse = null;
      }

      return true;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to delete course';
      return false;
    } finally {
      state.value.isSaving = false;
    }
  }

  /**
   * Publish a course
   */
  async function publishCourse(id: string): Promise<boolean> {
    state.value.isSaving = true;
    state.value.error = null;

    try {
      const course = await api.post<InstructorCourse>(`/courses/${id}/publish`);

      // Update in local state
      const index = state.value.courses.findIndex((c) => c.id === id);
      if (index !== -1) {
        state.value.courses[index] = course;
      }
      if (state.value.currentCourse?.id === id) {
        state.value.currentCourse = course;
      }

      return true;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to publish course';
      return false;
    } finally {
      state.value.isSaving = false;
    }
  }

  /**
   * Unpublish/archive a course
   */
  async function archiveCourse(id: string): Promise<boolean> {
    return updateCourse(id, { status: 'archived' as CourseStatus }) !== null;
  }

  /**
   * Clear current course
   */
  function clearCurrentCourse(): void {
    state.value.currentCourse = null;
  }

  /**
   * Clear error
   */
  function clearError(): void {
    state.value.error = null;
  }

  return {
    // State
    isLoading: computed(() => state.value.isLoading),
    isSaving: computed(() => state.value.isSaving),
    error: computed(() => state.value.error),
    courses: computed(() => state.value.courses),
    currentCourse: computed(() => state.value.currentCourse),

    // Computed
    hasCourses,
    draftCourses,
    publishedCourses,
    archivedCourses,

    // Methods
    fetchMyCourses,
    fetchCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    publishCourse,
    archiveCourse,
    clearCurrentCourse,
    clearError,
  };
}

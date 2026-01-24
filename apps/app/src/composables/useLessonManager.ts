/**
 * Lesson Manager Composable
 * Handles lesson CRUD operations and reordering within a chapter
 */

import type { Lesson, CreateLessonInput, UpdateLessonInput } from '@shared/types';
import { ref, computed } from 'vue';
import { useApi } from './useApi';

interface LessonManagerState {
  lessons: Map<string, Lesson[]>; // chapterId -> lessons
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export function useLessonManager(courseId: string) {
  const api = useApi();

  const state = ref<LessonManagerState>({
    lessons: new Map(),
    isLoading: false,
    isSaving: false,
    error: null,
  });

  /**
   * Get lessons for a specific chapter
   */
  function getLessonsForChapter(chapterId: string): Lesson[] {
    const lessons = state.value.lessons.get(chapterId) || [];
    return [...lessons].sort((a, b) => a.position - b.position);
  }

  /**
   * Fetch lessons for a chapter
   */
  async function fetchLessons(chapterId: string): Promise<void> {
    state.value.isLoading = true;
    state.value.error = null;

    try {
      const lessons = await api.get<Lesson[]>(
        `/courses/${courseId}/chapters/${chapterId}/lessons`
      );
      state.value.lessons.set(chapterId, lessons);
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to load lessons';
    } finally {
      state.value.isLoading = false;
    }
  }

  /**
   * Fetch lessons for multiple chapters
   */
  async function fetchAllLessons(chapterIds: string[]): Promise<void> {
    state.value.isLoading = true;
    state.value.error = null;

    try {
      await Promise.all(
        chapterIds.map(async (chapterId) => {
          const lessons = await api.get<Lesson[]>(
            `/courses/${courseId}/chapters/${chapterId}/lessons`
          );
          state.value.lessons.set(chapterId, lessons);
        })
      );
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to load lessons';
    } finally {
      state.value.isLoading = false;
    }
  }

  /**
   * Create a new lesson
   */
  async function createLesson(
    chapterId: string,
    input: CreateLessonInput
  ): Promise<Lesson | null> {
    state.value.isSaving = true;
    state.value.error = null;

    try {
      const lesson = await api.post<Lesson>(
        `/courses/${courseId}/chapters/${chapterId}/lessons`,
        input
      );

      // Add to local state
      const lessons = state.value.lessons.get(chapterId) || [];
      state.value.lessons.set(chapterId, [...lessons, lesson]);

      return lesson;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to create lesson';
      return null;
    } finally {
      state.value.isSaving = false;
    }
  }

  /**
   * Update an existing lesson
   */
  async function updateLesson(
    lessonId: string,
    input: UpdateLessonInput
  ): Promise<Lesson | null> {
    state.value.isSaving = true;
    state.value.error = null;

    try {
      const lesson = await api.patch<Lesson>(`/lessons/${lessonId}`, input);

      // Update in local state
      state.value.lessons.forEach((lessons, chapterId) => {
        const index = lessons.findIndex((l) => l.id === lessonId);
        if (index !== -1) {
          lessons[index] = lesson;
          state.value.lessons.set(chapterId, [...lessons]);
        }
      });

      return lesson;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to update lesson';
      return null;
    } finally {
      state.value.isSaving = false;
    }
  }

  /**
   * Delete a lesson
   */
  async function deleteLesson(lessonId: string): Promise<boolean> {
    state.value.isSaving = true;
    state.value.error = null;

    try {
      await api.delete(`/lessons/${lessonId}`);

      // Remove from local state
      state.value.lessons.forEach((lessons, chapterId) => {
        const filtered = lessons.filter((l) => l.id !== lessonId);
        if (filtered.length !== lessons.length) {
          state.value.lessons.set(chapterId, filtered);
        }
      });

      return true;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to delete lesson';
      return false;
    } finally {
      state.value.isSaving = false;
    }
  }

  /**
   * Reorder lessons within a chapter
   */
  async function reorderLessons(
    chapterId: string,
    lessonIds: string[]
  ): Promise<boolean> {
    state.value.isSaving = true;
    state.value.error = null;

    // Optimistically update local state
    const previousLessons = state.value.lessons.get(chapterId) || [];
    const reorderedLessons = lessonIds
      .map((id, index) => {
        const lesson = previousLessons.find((l) => l.id === id);
        if (lesson) {
          return { ...lesson, position: index };
        }
        return null;
      })
      .filter(Boolean) as Lesson[];
    state.value.lessons.set(chapterId, reorderedLessons);

    try {
      await api.patch(
        `/courses/${courseId}/chapters/${chapterId}/lessons/reorder`,
        { lessonIds }
      );
      return true;
    } catch (err) {
      // Revert on error
      state.value.lessons.set(chapterId, previousLessons);
      state.value.error =
        err instanceof Error ? err.message : 'Failed to reorder lessons';
      return false;
    } finally {
      state.value.isSaving = false;
    }
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

    // Methods
    getLessonsForChapter,
    fetchLessons,
    fetchAllLessons,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
    clearError,
  };
}

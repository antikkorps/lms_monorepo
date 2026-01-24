/**
 * Chapter Manager Composable
 * Handles chapter CRUD operations and reordering
 */

import type { Chapter, CreateChapterInput, UpdateChapterInput } from '@shared/types';
import { ref, computed } from 'vue';
import { useApi } from './useApi';

interface ChapterManagerState {
  chapters: Chapter[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export function useChapterManager(courseId: string) {
  const api = useApi();

  const state = ref<ChapterManagerState>({
    chapters: [],
    isLoading: false,
    isSaving: false,
    error: null,
  });

  // Computed
  const hasChapters = computed(() => state.value.chapters.length > 0);
  const sortedChapters = computed(() =>
    [...state.value.chapters].sort((a, b) => a.position - b.position)
  );

  /**
   * Fetch all chapters for a course
   */
  async function fetchChapters(): Promise<void> {
    state.value.isLoading = true;
    state.value.error = null;

    try {
      const chapters = await api.get<Chapter[]>(`/courses/${courseId}/chapters`);
      state.value.chapters = chapters;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to load chapters';
    } finally {
      state.value.isLoading = false;
    }
  }

  /**
   * Create a new chapter
   */
  async function createChapter(input: CreateChapterInput): Promise<Chapter | null> {
    state.value.isSaving = true;
    state.value.error = null;

    try {
      const chapter = await api.post<Chapter>(`/courses/${courseId}/chapters`, input);
      state.value.chapters.push(chapter);
      return chapter;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to create chapter';
      return null;
    } finally {
      state.value.isSaving = false;
    }
  }

  /**
   * Update an existing chapter
   */
  async function updateChapter(
    chapterId: string,
    input: UpdateChapterInput
  ): Promise<Chapter | null> {
    state.value.isSaving = true;
    state.value.error = null;

    try {
      const chapter = await api.patch<Chapter>(
        `/courses/${courseId}/chapters/${chapterId}`,
        input
      );

      // Update in local state
      const index = state.value.chapters.findIndex((c) => c.id === chapterId);
      if (index !== -1) {
        state.value.chapters[index] = chapter;
      }

      return chapter;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to update chapter';
      return null;
    } finally {
      state.value.isSaving = false;
    }
  }

  /**
   * Delete a chapter
   */
  async function deleteChapter(chapterId: string): Promise<boolean> {
    state.value.isSaving = true;
    state.value.error = null;

    try {
      await api.delete(`/courses/${courseId}/chapters/${chapterId}`);

      // Remove from local state
      state.value.chapters = state.value.chapters.filter((c) => c.id !== chapterId);

      return true;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to delete chapter';
      return false;
    } finally {
      state.value.isSaving = false;
    }
  }

  /**
   * Reorder chapters
   */
  async function reorderChapters(chapterIds: string[]): Promise<boolean> {
    state.value.isSaving = true;
    state.value.error = null;

    // Optimistically update local state
    const previousOrder = [...state.value.chapters];
    state.value.chapters = chapterIds.map((id, index) => {
      const chapter = state.value.chapters.find((c) => c.id === id);
      if (chapter) {
        return { ...chapter, position: index };
      }
      return chapter as Chapter;
    }).filter(Boolean);

    try {
      await api.patch(`/courses/${courseId}/chapters/reorder`, { chapterIds });
      return true;
    } catch (err) {
      // Revert on error
      state.value.chapters = previousOrder;
      state.value.error =
        err instanceof Error ? err.message : 'Failed to reorder chapters';
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
    chapters: sortedChapters,

    // Computed
    hasChapters,

    // Methods
    fetchChapters,
    createChapter,
    updateChapter,
    deleteChapter,
    reorderChapters,
    clearError,
  };
}

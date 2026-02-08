/**
 * Note Composable
 * Handles personal notes for lessons
 */

import type { Note, NoteWithLesson, UpsertNoteInput } from '@shared/types';
import { ref, computed } from 'vue';
import { useApi, ApiRequestError } from './useApi';
import { useToast } from './useToast';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface NoteState {
  currentNote: Note | null;
  isLoading: boolean;
  error: string | null;
  allNotes: NoteWithLesson[];
  allNotesLoading: boolean;
  pagination: Pagination;
}

export function useNote(lessonId?: string) {
  const api = useApi();
  const toast = useToast();

  const state = ref<NoteState>({
    currentNote: null,
    isLoading: false,
    error: null,
    allNotes: [],
    allNotesLoading: false,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  });

  const isSaving = ref(false);
  const hasUnsavedChanges = ref(false);
  const localContent = ref('');

  /**
   * Fetch note for a specific lesson
   */
  async function fetchNote(targetLessonId?: string): Promise<void> {
    const lid = targetLessonId || lessonId;
    if (!lid) {
      state.value.error = 'Lesson ID is required';
      return;
    }

    state.value.isLoading = true;
    state.value.error = null;

    try {
      const response = await api.get<{ data: Note | null }>(
        `/notes/lesson/${lid}`
      );
      const data = (response as unknown as { data: Note | null });
      state.value.currentNote = data.data !== undefined ? data.data : response as unknown as Note | null;
      localContent.value = state.value.currentNote?.content || '';
      hasUnsavedChanges.value = false;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        state.value.error = err.message;
      } else {
        state.value.error = 'Failed to load note';
      }
    } finally {
      state.value.isLoading = false;
    }
  }

  /**
   * Save (create or update) note for a lesson (optimistic)
   */
  async function saveNote(
    targetLessonId?: string,
    content?: string
  ): Promise<Note | null> {
    const lid = targetLessonId || lessonId;
    if (!lid) {
      state.value.error = 'Lesson ID is required';
      return null;
    }

    const noteContent = content ?? localContent.value;
    if (!noteContent.trim()) {
      state.value.error = 'Note content is required';
      return null;
    }

    // Snapshot for rollback
    const snapshot = {
      currentNote: state.value.currentNote ? { ...state.value.currentNote } : null,
      localContent: localContent.value,
      hasUnsavedChanges: hasUnsavedChanges.value,
    };

    // Apply optimistic update
    if (state.value.currentNote) {
      state.value.currentNote = {
        ...state.value.currentNote,
        content: noteContent,
        updatedAt: new Date(),
      };
    }
    hasUnsavedChanges.value = false;

    isSaving.value = true;
    state.value.error = null;

    try {
      const input: UpsertNoteInput = { content: noteContent };
      const response = await api.put<{ data: Note }>(
        `/notes/lesson/${lid}`,
        input
      );
      const note = (response as unknown as { data: Note }).data || response as unknown as Note;

      state.value.currentNote = note;
      localContent.value = note.content;
      hasUnsavedChanges.value = false;

      return note;
    } catch (err) {
      // Rollback
      state.value.currentNote = snapshot.currentNote;
      localContent.value = snapshot.localContent;
      hasUnsavedChanges.value = snapshot.hasUnsavedChanges;

      const message = err instanceof ApiRequestError ? err.message : 'Failed to save note';
      state.value.error = message;
      toast.error(message);
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  /**
   * Delete note for a lesson
   */
  async function deleteNote(targetLessonId?: string): Promise<boolean> {
    const lid = targetLessonId || lessonId;
    if (!lid) {
      state.value.error = 'Lesson ID is required';
      return false;
    }

    try {
      await api.delete(`/notes/lesson/${lid}`);

      state.value.currentNote = null;
      localContent.value = '';
      hasUnsavedChanges.value = false;

      return true;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === 'NOTE_NOT_FOUND') {
          // Already deleted or doesn't exist
          state.value.currentNote = null;
          localContent.value = '';
          hasUnsavedChanges.value = false;
          return true;
        }
        state.value.error = err.message;
      } else {
        state.value.error = 'Failed to delete note';
      }
      return false;
    }
  }

  /**
   * Fetch all user's notes with pagination
   */
  async function fetchAllNotes(
    page = 1,
    limit = 20,
    search?: string
  ): Promise<void> {
    state.value.allNotesLoading = true;
    state.value.error = null;

    try {
      const params: Record<string, string | number> = { page, limit };
      if (search) {
        params.search = search;
      }

      const response = await api.get<{
        data: NoteWithLesson[];
        pagination: Pagination;
      }>('/notes', params);

      const data = (response as unknown as { data: NoteWithLesson[]; pagination: Pagination });
      state.value.allNotes = data.data || response as unknown as NoteWithLesson[];
      if (data.pagination) {
        state.value.pagination = data.pagination;
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        state.value.error = err.message;
      } else {
        state.value.error = 'Failed to load notes';
      }
    } finally {
      state.value.allNotesLoading = false;
    }
  }

  /**
   * Update local content (for tracking unsaved changes)
   */
  function updateLocalContent(content: string): void {
    localContent.value = content;
    hasUnsavedChanges.value =
      content !== (state.value.currentNote?.content || '');
  }

  /**
   * Discard unsaved changes
   */
  function discardChanges(): void {
    localContent.value = state.value.currentNote?.content || '';
    hasUnsavedChanges.value = false;
  }

  /**
   * Clear error
   */
  function clearError(): void {
    state.value.error = null;
  }

  /**
   * Clear current note state
   */
  function clearNote(): void {
    state.value.currentNote = null;
    localContent.value = '';
    hasUnsavedChanges.value = false;
  }

  return {
    // Current note state
    currentNote: computed(() => state.value.currentNote),
    isLoading: computed(() => state.value.isLoading),
    error: computed(() => state.value.error),
    isSaving: computed(() => isSaving.value),
    hasUnsavedChanges: computed(() => hasUnsavedChanges.value),
    localContent: computed(() => localContent.value),

    // All notes state
    allNotes: computed(() => state.value.allNotes),
    allNotesLoading: computed(() => state.value.allNotesLoading),
    pagination: computed(() => state.value.pagination),

    // Current note methods
    fetchNote,
    saveNote,
    deleteNote,
    updateLocalContent,
    discardChanges,
    clearNote,

    // All notes methods
    fetchAllNotes,

    // Utilities
    clearError,
  };
}

/**
 * Quiz Builder Composable
 * Handles quiz questions CRUD operations
 */

import type {
  QuizQuestion,
  CreateQuestionInput,
  UpdateQuestionInput,
} from '@shared/types';
import { ref, computed } from 'vue';
import { useApi } from './useApi';

interface QuizBuilderState {
  questions: QuizQuestion[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export function useQuizBuilder(lessonId: string) {
  const api = useApi();

  const state = ref<QuizBuilderState>({
    questions: [],
    isLoading: false,
    isSaving: false,
    error: null,
  });

  // Computed
  const hasQuestions = computed(() => state.value.questions.length > 0);
  const sortedQuestions = computed(() =>
    [...state.value.questions].sort((a, b) => a.position - b.position)
  );
  const questionsCount = computed(() => state.value.questions.length);

  /**
   * Fetch all questions for a lesson
   */
  async function fetchQuestions(): Promise<void> {
    state.value.isLoading = true;
    state.value.error = null;

    try {
      const questions = await api.get<QuizQuestion[]>(
        `/lessons/${lessonId}/questions`
      );
      state.value.questions = questions;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to load questions';
    } finally {
      state.value.isLoading = false;
    }
  }

  /**
   * Create a new question
   */
  async function createQuestion(
    input: CreateQuestionInput
  ): Promise<QuizQuestion | null> {
    state.value.isSaving = true;
    state.value.error = null;

    try {
      const question = await api.post<QuizQuestion>(
        `/lessons/${lessonId}/questions`,
        input
      );
      state.value.questions.push(question);
      return question;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to create question';
      return null;
    } finally {
      state.value.isSaving = false;
    }
  }

  /**
   * Update an existing question
   */
  async function updateQuestion(
    questionId: string,
    input: UpdateQuestionInput
  ): Promise<QuizQuestion | null> {
    state.value.isSaving = true;
    state.value.error = null;

    try {
      const question = await api.patch<QuizQuestion>(
        `/lessons/${lessonId}/questions/${questionId}`,
        input
      );

      // Update in local state
      const index = state.value.questions.findIndex((q) => q.id === questionId);
      if (index !== -1) {
        state.value.questions[index] = question;
      }

      return question;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to update question';
      return null;
    } finally {
      state.value.isSaving = false;
    }
  }

  /**
   * Delete a question
   */
  async function deleteQuestion(questionId: string): Promise<boolean> {
    state.value.isSaving = true;
    state.value.error = null;

    try {
      await api.delete(`/lessons/${lessonId}/questions/${questionId}`);

      // Remove from local state
      state.value.questions = state.value.questions.filter(
        (q) => q.id !== questionId
      );

      return true;
    } catch (err) {
      state.value.error =
        err instanceof Error ? err.message : 'Failed to delete question';
      return false;
    } finally {
      state.value.isSaving = false;
    }
  }

  /**
   * Reorder questions
   */
  async function reorderQuestions(questionIds: string[]): Promise<boolean> {
    state.value.isSaving = true;
    state.value.error = null;

    // Optimistically update local state
    const previousOrder = [...state.value.questions];
    state.value.questions = questionIds
      .map((id, index) => {
        const question = state.value.questions.find((q) => q.id === id);
        if (question) {
          return { ...question, position: index };
        }
        return null;
      })
      .filter(Boolean) as QuizQuestion[];

    try {
      await api.patch(`/lessons/${lessonId}/questions/reorder`, { questionIds });
      return true;
    } catch (err) {
      // Revert on error
      state.value.questions = previousOrder;
      state.value.error =
        err instanceof Error ? err.message : 'Failed to reorder questions';
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
    questions: sortedQuestions,

    // Computed
    hasQuestions,
    questionsCount,

    // Methods
    fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    clearError,
  };
}

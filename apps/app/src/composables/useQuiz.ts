/**
 * Quiz Composable
 * Manages quiz state, answers, and submission with real API integration
 */

import type { QuizQuestion, QuizAnswer } from '@shared/schemas';
import { ref, computed } from 'vue';
import { useApi } from './useApi';

export interface QuizResult {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  answers: QuizAnswerResult[];
}

export interface QuizAnswerResult {
  questionId: string;
  isCorrect: boolean;
  correctOptionIds: string[];
  selectedOptionIds: string[];
  pointsEarned: number;
}

export type QuizMode = 'taking' | 'reviewing' | 'completed';

interface ApiQuizQuestion {
  id: string;
  lessonId: string;
  question: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false';
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  points: number;
  position: number;
}

interface ApiQuizSubmitResponse {
  id: string;
  score: number;
  maxScore: number;
  scorePercentage: number;
  passed: boolean;
  attemptNumber: number;
  correctAnswersCount: number;
  totalQuestions: number;
  answers: Array<{
    questionId: string;
    selectedOptionIds: string[];
    isCorrect: boolean;
    pointsEarned: number;
  }>;
  completedAt: string;
}

export function useQuiz(lessonId: string) {
  const api = useApi();

  // State
  const isLoading = ref(true);
  const isSubmitting = ref(false);
  const error = ref<string | null>(null);
  const questions = ref<QuizQuestion[]>([]);
  const currentQuestionIndex = ref(0);
  const userAnswers = ref<Map<string, string[]>>(new Map());
  const mode = ref<QuizMode>('taking');
  const result = ref<QuizResult | null>(null);
  const passingScore = ref(70); // Percentage needed to pass

  // Computed
  const currentQuestion = computed(() => questions.value[currentQuestionIndex.value] ?? null);
  const totalQuestions = computed(() => questions.value.length);
  const isFirstQuestion = computed(() => currentQuestionIndex.value === 0);
  const isLastQuestion = computed(() => currentQuestionIndex.value === questions.value.length - 1);

  const answeredCount = computed(() => {
    let count = 0;
    for (const q of questions.value) {
      const answer = userAnswers.value.get(q.id);
      if (answer && answer.length > 0) count++;
    }
    return count;
  });

  const progressPercentage = computed(() => {
    if (totalQuestions.value === 0) return 0;
    return Math.round((answeredCount.value / totalQuestions.value) * 100);
  });

  const maxScore = computed(() => {
    return questions.value.reduce((sum, q) => sum + q.points, 0);
  });

  const canSubmit = computed(() => {
    return answeredCount.value === totalQuestions.value;
  });

  const currentAnswer = computed(() => {
    if (!currentQuestion.value) return [];
    return userAnswers.value.get(currentQuestion.value.id) ?? [];
  });

  // Methods
  function setAnswer(questionId: string, optionIds: string[]) {
    userAnswers.value.set(questionId, optionIds);
  }

  function toggleOption(questionId: string, optionId: string) {
    const question = questions.value.find((q) => q.id === questionId);
    if (!question) return;

    const currentSelection = userAnswers.value.get(questionId) ?? [];

    if (question.type === 'single_choice' || question.type === 'true_false') {
      // Single selection - replace
      userAnswers.value.set(questionId, [optionId]);
    } else {
      // Multiple selection - toggle
      if (currentSelection.includes(optionId)) {
        userAnswers.value.set(
          questionId,
          currentSelection.filter((id) => id !== optionId)
        );
      } else {
        userAnswers.value.set(questionId, [...currentSelection, optionId]);
      }
    }
  }

  function nextQuestion() {
    if (currentQuestionIndex.value < questions.value.length - 1) {
      currentQuestionIndex.value++;
    }
  }

  function previousQuestion() {
    if (currentQuestionIndex.value > 0) {
      currentQuestionIndex.value--;
    }
  }

  function goToQuestion(index: number) {
    if (index >= 0 && index < questions.value.length) {
      currentQuestionIndex.value = index;
    }
  }

  function isOptionSelected(questionId: string, optionId: string): boolean {
    const answer = userAnswers.value.get(questionId);
    return answer?.includes(optionId) ?? false;
  }

  function getAnswerResult(questionId: string): QuizAnswerResult | null {
    return result.value?.answers.find((a) => a.questionId === questionId) ?? null;
  }

  function isAnswerCorrect(questionId: string): boolean | null {
    const answerResult = getAnswerResult(questionId);
    return answerResult?.isCorrect ?? null;
  }

  /**
   * Transform API question to local format
   */
  function transformQuestion(apiQuestion: ApiQuizQuestion): QuizQuestion {
    return {
      id: apiQuestion.id,
      lessonId: apiQuestion.lessonId,
      question: apiQuestion.question,
      type: apiQuestion.type,
      options: apiQuestion.options,
      points: apiQuestion.points,
      position: apiQuestion.position,
    };
  }

  async function fetchQuestions(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await api.get<{ data: ApiQuizQuestion[] }>(`/lessons/${lessonId}/questions`);
      questions.value = response.data.map(transformQuestion);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load quiz';
    } finally {
      isLoading.value = false;
    }
  }

  async function submitQuiz(): Promise<boolean> {
    if (!canSubmit.value) return false;

    isSubmitting.value = true;
    error.value = null;

    try {
      // Build submission payload
      const answers: QuizAnswer[] = [];
      for (const [questionId, selectedOptionIds] of userAnswers.value) {
        answers.push({ questionId, selectedOptionIds });
      }

      const response = await api.post<{ data: ApiQuizSubmitResponse }>(
        `/lessons/${lessonId}/quiz/submit`,
        { answers }
      );

      const apiResult = response.data;

      // Transform API response to local format
      const answerResults: QuizAnswerResult[] = apiResult.answers.map((answer) => {
        const question = questions.value.find((q) => q.id === answer.questionId);
        const correctOptionIds = question?.options.filter((o) => o.isCorrect).map((o) => o.id) ?? [];

        return {
          questionId: answer.questionId,
          isCorrect: answer.isCorrect,
          correctOptionIds,
          selectedOptionIds: answer.selectedOptionIds,
          pointsEarned: answer.pointsEarned,
        };
      });

      result.value = {
        score: apiResult.score,
        maxScore: apiResult.maxScore,
        percentage: apiResult.scorePercentage,
        passed: apiResult.passed,
        answers: answerResults,
      };

      mode.value = 'completed';
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to submit quiz';
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  /**
   * Submit quiz locally without API call (for preview mode)
   */
  async function submitQuizLocally(): Promise<boolean> {
    if (!canSubmit.value) return false;

    isSubmitting.value = true;
    error.value = null;

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      let totalScore = 0;
      const answerResults: QuizAnswerResult[] = [];

      for (const question of questions.value) {
        const userAnswer = userAnswers.value.get(question.id) ?? [];
        const correctOptionIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);

        // Check if answer is correct
        const isCorrect =
          userAnswer.length === correctOptionIds.length &&
          userAnswer.every((id) => correctOptionIds.includes(id));

        const pointsEarned = isCorrect ? question.points : 0;
        totalScore += pointsEarned;

        answerResults.push({
          questionId: question.id,
          isCorrect,
          correctOptionIds,
          selectedOptionIds: userAnswer,
          pointsEarned,
        });
      }

      const percentage = Math.round((totalScore / maxScore.value) * 100);

      result.value = {
        score: totalScore,
        maxScore: maxScore.value,
        percentage,
        passed: percentage >= passingScore.value,
        answers: answerResults,
      };

      mode.value = 'completed';
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to submit quiz';
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  function reviewAnswers() {
    mode.value = 'reviewing';
    currentQuestionIndex.value = 0;
  }

  function resetQuiz() {
    userAnswers.value.clear();
    currentQuestionIndex.value = 0;
    result.value = null;
    mode.value = 'taking';
  }

  return {
    // State
    isLoading,
    isSubmitting,
    error,
    questions,
    currentQuestionIndex,
    mode,
    result,
    passingScore,

    // Computed
    currentQuestion,
    totalQuestions,
    isFirstQuestion,
    isLastQuestion,
    answeredCount,
    progressPercentage,
    maxScore,
    canSubmit,
    currentAnswer,

    // Methods
    fetchQuestions,
    setAnswer,
    toggleOption,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    isOptionSelected,
    getAnswerResult,
    isAnswerCorrect,
    submitQuiz,
    submitQuizLocally,
    reviewAnswers,
    resetQuiz,
  };
}

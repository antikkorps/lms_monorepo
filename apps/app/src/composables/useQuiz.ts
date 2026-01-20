/**
 * Quiz Composable
 * Manages quiz state, answers, and submission
 */

import type { QuizQuestion, QuizAnswer, SubmitQuizInput } from '@shared/schemas';
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

// Mock questions for development
function getMockQuestions(lessonId: string): QuizQuestion[] {
  return [
    {
      id: 'q1',
      lessonId,
      question: 'What is the primary purpose of machine learning?',
      type: 'single_choice',
      options: [
        { id: 'q1-a', text: 'To replace all human workers', isCorrect: false },
        { id: 'q1-b', text: 'To enable computers to learn from data without explicit programming', isCorrect: true },
        { id: 'q1-c', text: 'To make computers faster', isCorrect: false },
        { id: 'q1-d', text: 'To store more data', isCorrect: false },
      ],
      points: 10,
      position: 1,
    },
    {
      id: 'q2',
      lessonId,
      question: 'Which of the following are types of machine learning? (Select all that apply)',
      type: 'multiple_choice',
      options: [
        { id: 'q2-a', text: 'Supervised Learning', isCorrect: true },
        { id: 'q2-b', text: 'Unsupervised Learning', isCorrect: true },
        { id: 'q2-c', text: 'Reinforcement Learning', isCorrect: true },
        { id: 'q2-d', text: 'Mechanical Learning', isCorrect: false },
      ],
      points: 15,
      position: 2,
    },
    {
      id: 'q3',
      lessonId,
      question: 'Neural networks are inspired by the human brain.',
      type: 'true_false',
      options: [
        { id: 'q3-a', text: 'True', isCorrect: true },
        { id: 'q3-b', text: 'False', isCorrect: false },
      ],
      points: 5,
      position: 3,
    },
    {
      id: 'q4',
      lessonId,
      question: 'What is overfitting in machine learning?',
      type: 'single_choice',
      options: [
        { id: 'q4-a', text: 'When a model performs well on training data but poorly on new data', isCorrect: true },
        { id: 'q4-b', text: 'When a model is too simple to capture patterns', isCorrect: false },
        { id: 'q4-c', text: 'When the training data is too large', isCorrect: false },
        { id: 'q4-d', text: 'When the model trains too quickly', isCorrect: false },
      ],
      points: 10,
      position: 4,
    },
    {
      id: 'q5',
      lessonId,
      question: 'Which techniques can help prevent overfitting? (Select all that apply)',
      type: 'multiple_choice',
      options: [
        { id: 'q5-a', text: 'Cross-validation', isCorrect: true },
        { id: 'q5-b', text: 'Regularization', isCorrect: true },
        { id: 'q5-c', text: 'Using more training data', isCorrect: true },
        { id: 'q5-d', text: 'Removing all validation data', isCorrect: false },
      ],
      points: 15,
      position: 5,
    },
  ];
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

  async function fetchQuestions(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      // TODO: Replace with real API call
      // const data = await api.get<QuizQuestion[]>(`/lessons/${lessonId}/quiz`);

      await new Promise((resolve) => setTimeout(resolve, 500));
      questions.value = getMockQuestions(lessonId);
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

      const payload: SubmitQuizInput = {
        lessonId,
        answers,
      };

      // TODO: Replace with real API call
      // const response = await api.post<QuizResult>(`/lessons/${lessonId}/quiz/submit`, payload);

      // Mock grading
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
    reviewAnswers,
    resetQuiz,
  };
}

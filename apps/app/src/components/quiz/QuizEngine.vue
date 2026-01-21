<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Eye,
} from 'lucide-vue-next';
import { useQuiz } from '@/composables/useQuiz';
import QuizQuestion from './QuizQuestion.vue';
import QuizProgress from './QuizProgress.vue';
import QuizResult from './QuizResult.vue';

interface Props {
  lessonId: string;
  lessonTitle?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'completed', passed: boolean, score: number): void;
  (e: 'close'): void;
}>();

const {
  isLoading,
  isSubmitting,
  error,
  questions,
  currentQuestionIndex,
  mode,
  result,
  passingScore,
  currentQuestion,
  totalQuestions,
  isFirstQuestion,
  isLastQuestion,
  answeredCount,
  progressPercentage,
  maxScore,
  canSubmit,
  currentAnswer,
  fetchQuestions,
  toggleOption,
  nextQuestion,
  previousQuestion,
  goToQuestion,
  isOptionSelected,
  getAnswerResult,
  submitQuiz,
  reviewAnswers,
  resetQuiz,
} = useQuiz(props.lessonId);

onMounted(() => {
  fetchQuestions();
});

async function handleSubmit() {
  const success = await submitQuiz();
  if (success && result.value) {
    emit('completed', result.value.passed, result.value.score);
  }
}

function handleRetry() {
  resetQuiz();
}

function handleReview() {
  reviewAnswers();
}

function handleClose() {
  emit('close');
}

const showNavigation = computed(() => mode.value !== 'completed');
const showSubmitButton = computed(() => mode.value === 'taking' && isLastQuestion.value);
const showResultScreen = computed(() => mode.value === 'completed' && result.value);
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-2xl font-bold">Quiz</h2>
      <p v-if="lessonTitle" class="text-muted-foreground">{{ lessonTitle }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">Failed to load quiz</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchQuestions">Retry</Button>
      </CardContent>
    </Card>

    <!-- Result Screen -->
    <QuizResult
      v-else-if="showResultScreen"
      :result="result!"
      :passing-score="passingScore"
      @review="handleReview"
      @retry="handleRetry"
      @close="handleClose"
    />

    <!-- Quiz Content -->
    <template v-else-if="questions.length > 0">
      <!-- Progress Bar -->
      <QuizProgress
        :current="currentQuestionIndex + 1"
        :total="totalQuestions"
        :answered="answeredCount"
        :percentage="progressPercentage"
        :mode="mode"
        @go-to="goToQuestion"
      />

      <!-- Question Card -->
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardDescription>
              Question {{ currentQuestionIndex + 1 }} of {{ totalQuestions }}
            </CardDescription>
            <span class="text-sm text-muted-foreground">
              {{ currentQuestion?.points }} points
            </span>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <QuizQuestion
            v-if="currentQuestion"
            :question="currentQuestion"
            :selected-options="currentAnswer"
            :mode="mode"
            :answer-result="getAnswerResult(currentQuestion.id)"
            @toggle-option="(optionId) => toggleOption(currentQuestion!.id, optionId)"
          />
        </CardContent>
      </Card>

      <!-- Navigation -->
      <div v-if="showNavigation" class="flex items-center justify-between">
        <Button variant="outline" :disabled="isFirstQuestion" @click="previousQuestion">
          <ChevronLeft class="mr-1 h-4 w-4" />
          Previous
        </Button>

        <div class="flex items-center gap-2">
          <!-- Submit button on last question -->
          <Button
            v-if="showSubmitButton"
            :disabled="!canSubmit || isSubmitting"
            @click="handleSubmit"
          >
            <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
            <template v-else>Submit Quiz</template>
          </Button>

          <!-- Next button -->
          <Button v-if="!isLastQuestion" @click="nextQuestion">
            Next
            <ChevronRight class="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- Review mode: Back to results -->
      <div v-if="mode === 'reviewing'" class="flex justify-center">
        <Button variant="outline" @click="mode = 'completed'">
          Back to Results
        </Button>
      </div>

      <!-- Answer status indicator (in taking mode) -->
      <div v-if="mode === 'taking'" class="text-center text-sm text-muted-foreground">
        {{ answeredCount }} of {{ totalQuestions }} questions answered
        <span v-if="!canSubmit" class="text-yellow-600">
          (Answer all questions to submit)
        </span>
      </div>
    </template>

    <!-- Empty state -->
    <Card v-else>
      <CardContent class="py-8 text-center">
        <p class="text-muted-foreground">No questions available for this quiz.</p>
      </CardContent>
    </Card>
  </div>
</template>

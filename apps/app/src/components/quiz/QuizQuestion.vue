<script setup lang="ts">
import type { QuizQuestion } from '@shared/schemas';
import type { QuizAnswerResult, QuizMode } from '@/composables/useQuiz';
import { CheckCircle2, XCircle, Circle } from 'lucide-vue-next';

interface Props {
  question: QuizQuestion;
  selectedOptions: string[];
  mode: QuizMode;
  answerResult: QuizAnswerResult | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'toggle-option', optionId: string): void;
}>();

function isSelected(optionId: string): boolean {
  return props.selectedOptions.includes(optionId);
}

function isCorrectOption(optionId: string): boolean {
  return props.answerResult?.correctOptionIds.includes(optionId) ?? false;
}

function getOptionClass(optionId: string): string {
  const baseClass = 'flex items-center gap-3 rounded-lg border p-4 transition-all';

  if (props.mode === 'taking') {
    // Taking mode - show selection state
    if (isSelected(optionId)) {
      return `${baseClass} border-primary bg-primary/5 ring-2 ring-primary`;
    }
    return `${baseClass} hover:border-muted-foreground/50 hover:bg-muted/50 cursor-pointer`;
  }

  // Reviewing mode - show correct/incorrect
  const isOptionCorrect = isCorrectOption(optionId);
  const wasSelected = isSelected(optionId);

  if (isOptionCorrect && wasSelected) {
    // Correct answer selected
    return `${baseClass} border-green-500 bg-green-50`;
  }
  if (isOptionCorrect && !wasSelected) {
    // Correct answer not selected (missed)
    return `${baseClass} border-green-500 bg-green-50/50`;
  }
  if (!isOptionCorrect && wasSelected) {
    // Wrong answer selected
    return `${baseClass} border-red-500 bg-red-50`;
  }
  // Not selected, not correct
  return `${baseClass} opacity-60`;
}

function handleOptionClick(optionId: string) {
  if (props.mode === 'taking') {
    emit('toggle-option', optionId);
  }
}

function getQuestionTypeLabel(): string {
  switch (props.question.type) {
    case 'single_choice':
      return 'Select one answer';
    case 'multiple_choice':
      return 'Select all that apply';
    case 'true_false':
      return 'True or False';
    default:
      return '';
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Question Text -->
    <div>
      <h3 class="text-lg font-medium">{{ question.question }}</h3>
      <p class="mt-1 text-sm text-muted-foreground">{{ getQuestionTypeLabel() }}</p>
    </div>

    <!-- Options -->
    <div class="space-y-2">
      <button
        v-for="option in question.options"
        :key="option.id"
        type="button"
        :class="getOptionClass(option.id)"
        :disabled="mode !== 'taking'"
        @click="handleOptionClick(option.id)"
      >
        <!-- Selection indicator -->
        <div class="shrink-0">
          <!-- Taking mode -->
          <template v-if="mode === 'taking'">
            <div
              v-if="question.type === 'single_choice' || question.type === 'true_false'"
              class="flex h-5 w-5 items-center justify-center rounded-full border-2"
              :class="isSelected(option.id) ? 'border-primary bg-primary' : 'border-muted-foreground/30'"
            >
              <div v-if="isSelected(option.id)" class="h-2 w-2 rounded-full bg-white" />
            </div>
            <div
              v-else
              class="flex h-5 w-5 items-center justify-center rounded border-2"
              :class="isSelected(option.id) ? 'border-primary bg-primary' : 'border-muted-foreground/30'"
            >
              <CheckCircle2 v-if="isSelected(option.id)" class="h-3 w-3 text-white" />
            </div>
          </template>

          <!-- Reviewing mode -->
          <template v-else>
            <CheckCircle2
              v-if="isCorrectOption(option.id)"
              class="h-5 w-5 text-green-600"
            />
            <XCircle
              v-else-if="isSelected(option.id)"
              class="h-5 w-5 text-red-600"
            />
            <Circle v-else class="h-5 w-5 text-muted-foreground/30" />
          </template>
        </div>

        <!-- Option text -->
        <span class="flex-1 text-left">{{ option.text }}</span>

        <!-- Feedback badges in review mode -->
        <div v-if="mode === 'reviewing'" class="shrink-0">
          <span
            v-if="isCorrectOption(option.id)"
            class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
          >
            Correct
          </span>
          <span
            v-else-if="isSelected(option.id)"
            class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
          >
            Incorrect
          </span>
        </div>
      </button>
    </div>

    <!-- Answer feedback in review mode -->
    <div v-if="mode === 'reviewing' && answerResult" class="rounded-lg bg-muted p-4">
      <div class="flex items-center gap-2">
        <CheckCircle2 v-if="answerResult.isCorrect" class="h-5 w-5 text-green-600" />
        <XCircle v-else class="h-5 w-5 text-red-600" />
        <span class="font-medium">
          {{ answerResult.isCorrect ? 'Correct!' : 'Incorrect' }}
        </span>
        <span class="text-sm text-muted-foreground">
          ({{ answerResult.pointsEarned }} / {{ question.points }} points)
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { QuizResult } from '@/composables/useQuiz';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, XCircle, Eye, RotateCcw, ArrowRight, CheckCircle2 } from 'lucide-vue-next';

interface Props {
  result: QuizResult;
  passingScore: number;
  isPreview?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isPreview: false,
});

const emit = defineEmits<{
  (e: 'review'): void;
  (e: 'retry'): void;
  (e: 'close'): void;
}>();

function getScoreColor(): string {
  if (props.result.percentage >= 80) return 'text-green-600';
  if (props.result.percentage >= props.passingScore) return 'text-yellow-600';
  return 'text-red-600';
}

function getProgressColor(): string {
  if (props.result.percentage >= 80) return 'bg-green-500';
  if (props.result.percentage >= props.passingScore) return 'bg-yellow-500';
  return 'bg-red-500';
}

const correctCount = props.result.answers.filter((a) => a.isCorrect).length;
const incorrectCount = props.result.answers.length - correctCount;
</script>

<template>
  <Card>
    <!-- Preview Mode Notice -->
    <div
      v-if="isPreview"
      class="rounded-t-lg border-b border-amber-300 bg-amber-50 px-4 py-2 text-center dark:border-amber-700 dark:bg-amber-950/50"
    >
      <div class="flex items-center justify-center gap-2">
        <Eye class="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span class="text-sm text-amber-700 dark:text-amber-300">
          Preview Mode - These results are not saved
        </span>
      </div>
    </div>

    <CardHeader class="text-center">
      <!-- Result Icon -->
      <div class="mx-auto mb-4">
        <div
          v-if="result.passed"
          class="flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
        >
          <Trophy class="h-10 w-10 text-green-600" />
        </div>
        <div v-else class="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <XCircle class="h-10 w-10 text-red-600" />
        </div>
      </div>

      <CardTitle class="text-2xl">
        {{ result.passed ? 'Congratulations!' : 'Keep Practicing!' }}
      </CardTitle>
      <CardDescription>
        {{
          result.passed
            ? 'You passed the quiz!'
            : `You need ${passingScore}% to pass. Try again!`
        }}
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Score Display -->
      <div class="text-center">
        <div class="text-5xl font-bold" :class="getScoreColor()">
          {{ result.percentage }}%
        </div>
        <p class="mt-1 text-muted-foreground">
          {{ result.score }} / {{ result.maxScore }} points
        </p>
      </div>

      <!-- Progress Ring -->
      <div class="mx-auto w-full max-w-xs">
        <div class="h-3 overflow-hidden rounded-full bg-muted">
          <div
            class="h-full transition-all duration-500"
            :class="getProgressColor()"
            :style="{ width: `${result.percentage}%` }"
          />
        </div>
        <div class="mt-2 flex justify-between text-sm text-muted-foreground">
          <span>0%</span>
          <span>Passing: {{ passingScore }}%</span>
          <span>100%</span>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-lg bg-green-50 p-4 text-center">
          <div class="flex items-center justify-center gap-2">
            <CheckCircle2 class="h-5 w-5 text-green-600" />
            <span class="text-2xl font-bold text-green-600">{{ correctCount }}</span>
          </div>
          <p class="text-sm text-green-700">Correct</p>
        </div>
        <div class="rounded-lg bg-red-50 p-4 text-center">
          <div class="flex items-center justify-center gap-2">
            <XCircle class="h-5 w-5 text-red-600" />
            <span class="text-2xl font-bold text-red-600">{{ incorrectCount }}</span>
          </div>
          <p class="text-sm text-red-700">Incorrect</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button variant="outline" @click="emit('review')">
          <Eye class="mr-2 h-4 w-4" />
          Review Answers
        </Button>
        <Button v-if="!result.passed" variant="outline" @click="emit('retry')">
          <RotateCcw class="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button @click="emit('close')">
          {{ result.passed ? 'Continue' : 'Back to Course' }}
          <ArrowRight class="ml-2 h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

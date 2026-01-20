<script setup lang="ts">
import type { QuizMode } from '@/composables/useQuiz';

interface Props {
  current: number;
  total: number;
  answered: number;
  percentage: number;
  mode: QuizMode;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'go-to', index: number): void;
}>();

function getStepClass(index: number): string {
  const isActive = index + 1 === props.current;
  const isAnswered = index < props.answered || (props.mode === 'reviewing');

  const baseClass = 'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all';

  if (isActive) {
    return `${baseClass} bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2`;
  }
  if (isAnswered) {
    return `${baseClass} bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer`;
  }
  return `${baseClass} bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer`;
}

function handleStepClick(index: number) {
  emit('go-to', index);
}
</script>

<template>
  <div class="space-y-3">
    <!-- Progress bar -->
    <div class="flex items-center gap-3">
      <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          class="h-full bg-primary transition-all duration-300"
          :style="{ width: `${percentage}%` }"
        />
      </div>
      <span class="shrink-0 text-sm font-medium">
        {{ percentage }}%
      </span>
    </div>

    <!-- Question dots/numbers -->
    <div class="flex flex-wrap items-center justify-center gap-2">
      <button
        v-for="(_, index) in total"
        :key="index"
        type="button"
        :class="getStepClass(index)"
        @click="handleStepClick(index)"
      >
        {{ index + 1 }}
      </button>
    </div>
  </div>
</template>

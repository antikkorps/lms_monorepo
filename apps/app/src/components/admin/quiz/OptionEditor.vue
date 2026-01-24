<script setup lang="ts">
import { computed } from 'vue';
import type { QuizOption } from '@shared/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { GripVertical, Trash2 } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

interface Props {
  option: { text: string; isCorrect: boolean };
  index: number;
  canDelete?: boolean;
}

interface Emits {
  (e: 'update', option: { text: string; isCorrect: boolean }): void;
  (e: 'delete'): void;
}

const props = withDefaults(defineProps<Props>(), {
  canDelete: true,
});
const emit = defineEmits<Emits>();
const { t } = useI18n();

const optionLabel = computed(() => String.fromCharCode(65 + props.index)); // A, B, C, D...

function handleTextChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit('update', { ...props.option, text: target.value });
}

function handleCorrectChange(checked: boolean): void {
  emit('update', { ...props.option, isCorrect: checked });
}

function handleDelete(): void {
  emit('delete');
}
</script>

<template>
  <div class="flex items-start gap-3 p-3 rounded-lg border bg-card">
    <!-- Drag Handle -->
    <div class="cursor-grab active:cursor-grabbing touch-none text-muted-foreground mt-2">
      <GripVertical class="h-4 w-4" />
    </div>

    <!-- Option Label -->
    <div
      class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
      :class="option.isCorrect ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-muted text-muted-foreground'"
    >
      {{ optionLabel }}
    </div>

    <!-- Option Text -->
    <div class="flex-1 space-y-2">
      <Input
        :value="option.text"
        :placeholder="t('instructor.quiz.optionPlaceholder', 'Enter option text...')"
        @input="handleTextChange"
      />
    </div>

    <!-- Is Correct -->
    <div class="flex items-center gap-2 mt-2">
      <Checkbox
        :id="`option-correct-${index}`"
        :checked="option.isCorrect"
        @update:checked="handleCorrectChange"
      />
      <Label :for="`option-correct-${index}`" class="text-sm text-muted-foreground cursor-pointer">
        {{ t('instructor.quiz.correct', 'Correct') }}
      </Label>
    </div>

    <!-- Delete -->
    <Button
      v-if="canDelete"
      variant="ghost"
      size="icon"
      class="h-8 w-8 text-muted-foreground hover:text-destructive"
      @click="handleDelete"
    >
      <Trash2 class="h-4 w-4" />
    </Button>
  </div>
</template>

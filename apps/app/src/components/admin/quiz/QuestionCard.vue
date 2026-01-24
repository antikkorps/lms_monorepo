<script setup lang="ts">
import type { QuizQuestion } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
} from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface Props {
  question: QuizQuestion;
  index: number;
  isDragging?: boolean;
}

interface Emits {
  (e: 'edit', question: QuizQuestion): void;
  (e: 'delete', question: QuizQuestion): void;
}

const props = withDefaults(defineProps<Props>(), {
  isDragging: false,
});
const emit = defineEmits<Emits>();
const { t } = useI18n();

const correctOptionsCount = computed(() =>
  props.question.options.filter((o) => o.isCorrect).length
);

function handleEdit(): void {
  emit('edit', props.question);
}

function handleDelete(): void {
  emit('delete', props.question);
}
</script>

<template>
  <Card
    :class="[
      'transition-all',
      isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : '',
    ]"
  >
    <CardHeader class="pb-3">
      <div class="flex items-start gap-3">
        <!-- Drag Handle -->
        <div class="cursor-grab active:cursor-grabbing touch-none mt-1">
          <GripVertical class="h-5 w-5 text-muted-foreground" />
        </div>

        <!-- Question Number -->
        <Badge variant="outline" class="flex-shrink-0">
          Q{{ index + 1 }}
        </Badge>

        <!-- Question Content -->
        <div class="flex-1 min-w-0">
          <p class="font-medium">{{ question.question }}</p>
          <div class="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>
              {{ question.options.length }}
              {{ t('instructor.quiz.options', 'options') }}
            </span>
            <span class="flex items-center gap-1">
              <CheckCircle2 class="h-3.5 w-3.5 text-green-500" />
              {{ correctOptionsCount }}
              {{ t('instructor.quiz.correct', 'correct') }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon">
              <MoreHorizontal class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="handleEdit">
              <Pencil class="mr-2 h-4 w-4" />
              {{ t('common.edit', 'Edit') }}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              class="text-destructive focus:text-destructive"
              @click="handleDelete"
            >
              <Trash2 class="mr-2 h-4 w-4" />
              {{ t('common.delete', 'Delete') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardHeader>

    <CardContent class="pt-0">
      <!-- Options Preview -->
      <div class="space-y-1.5">
        <div
          v-for="(option, optIndex) in question.options"
          :key="option.id"
          class="flex items-center gap-2 text-sm"
        >
          <div
            class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs"
            :class="option.isCorrect ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-muted text-muted-foreground'"
          >
            {{ String.fromCharCode(65 + optIndex) }}
          </div>
          <span :class="option.isCorrect ? 'font-medium' : 'text-muted-foreground'">
            {{ option.text }}
          </span>
          <CheckCircle2
            v-if="option.isCorrect"
            class="h-3.5 w-3.5 text-green-500 flex-shrink-0"
          />
        </div>
      </div>

      <!-- Explanation -->
      <div v-if="question.explanation" class="mt-3 pt-3 border-t">
        <p class="text-sm text-muted-foreground">
          <span class="font-medium">{{ t('instructor.quiz.explanation', 'Explanation:') }}</span>
          {{ question.explanation }}
        </p>
      </div>
    </CardContent>
  </Card>
</template>

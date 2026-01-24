<script setup lang="ts">
import type { Lesson, LessonType } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Video,
  FileQuestion,
  FileText,
  ClipboardList,
  ExternalLink,
} from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface Props {
  lesson: Lesson;
  isDragging?: boolean;
}

interface Emits {
  (e: 'edit', lesson: Lesson): void;
  (e: 'delete', lesson: Lesson): void;
  (e: 'open', lesson: Lesson): void;
}

const props = withDefaults(defineProps<Props>(), {
  isDragging: false,
});
const emit = defineEmits<Emits>();
const { t } = useI18n();

const typeIcon = computed(() => {
  switch (props.lesson.type) {
    case 'video':
      return Video;
    case 'quiz':
      return FileQuestion;
    case 'document':
      return FileText;
    case 'assignment':
      return ClipboardList;
    default:
      return FileText;
  }
});

const typeLabel = computed(() => {
  switch (props.lesson.type) {
    case 'video':
      return t('instructor.lessonTypes.video', 'Video');
    case 'quiz':
      return t('instructor.lessonTypes.quiz', 'Quiz');
    case 'document':
      return t('instructor.lessonTypes.document', 'Document');
    case 'assignment':
      return t('instructor.lessonTypes.assignment', 'Assignment');
    default:
      return props.lesson.type;
  }
});

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function handleEdit(): void {
  emit('edit', props.lesson);
}

function handleDelete(): void {
  emit('delete', props.lesson);
}

function handleOpen(): void {
  emit('open', props.lesson);
}
</script>

<template>
  <div
    :class="[
      'flex items-center gap-3 p-3 rounded-lg border bg-card transition-all',
      isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : 'hover:bg-muted/50',
    ]"
  >
    <!-- Drag Handle -->
    <div class="cursor-grab active:cursor-grabbing touch-none text-muted-foreground">
      <GripVertical class="h-4 w-4" />
    </div>

    <!-- Type Icon -->
    <div class="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center">
      <component :is="typeIcon" class="h-4 w-4 text-muted-foreground" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="font-medium truncate">{{ lesson.title }}</p>
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{{ typeLabel }}</span>
        <span v-if="lesson.duration > 0">{{ formatDuration(lesson.duration) }}</span>
      </div>
    </div>

    <!-- Free Badge -->
    <Badge v-if="lesson.isFree" variant="outline" class="flex-shrink-0">
      {{ t('instructor.lessons.free', 'Free') }}
    </Badge>

    <!-- Actions -->
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon" class="h-8 w-8">
          <MoreHorizontal class="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem @click="handleOpen">
          <ExternalLink class="mr-2 h-4 w-4" />
          {{ t('instructor.lessons.open', 'Open Editor') }}
        </DropdownMenuItem>
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
</template>

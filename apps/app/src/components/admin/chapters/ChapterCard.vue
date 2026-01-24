<script setup lang="ts">
import type { Chapter } from '@shared/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from 'lucide-vue-next';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

interface Props {
  chapter: Chapter;
  isDragging?: boolean;
}

interface Emits {
  (e: 'edit', chapter: Chapter): void;
  (e: 'delete', chapter: Chapter): void;
  (e: 'add-lesson', chapterId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  isDragging: false,
});
const emit = defineEmits<Emits>();
const { t } = useI18n();

const isExpanded = ref(true);

function handleEdit(): void {
  emit('edit', props.chapter);
}

function handleDelete(): void {
  emit('delete', props.chapter);
}

function handleAddLesson(): void {
  emit('add-lesson', props.chapter.id);
}
</script>

<template>
  <Card
    :class="[
      'transition-all',
      isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : '',
    ]"
  >
    <Collapsible v-model:open="isExpanded">
      <CardHeader class="pb-3">
        <div class="flex items-center gap-3">
          <!-- Drag Handle -->
          <div class="cursor-grab active:cursor-grabbing touch-none">
            <GripVertical class="h-5 w-5 text-muted-foreground" />
          </div>

          <!-- Expand/Collapse -->
          <CollapsibleTrigger as-child>
            <Button variant="ghost" size="icon" class="h-6 w-6">
              <ChevronDown v-if="isExpanded" class="h-4 w-4" />
              <ChevronRight v-else class="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>

          <!-- Title and Info -->
          <div class="flex-1 min-w-0">
            <CardTitle class="text-base truncate">{{ chapter.title }}</CardTitle>
            <p class="text-sm text-muted-foreground">
              {{ chapter.lessonsCount }}
              {{ t('instructor.chapters.lessonsCount', 'lessons') }}
            </p>
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
              <DropdownMenuItem @click="handleAddLesson">
                <Plus class="mr-2 h-4 w-4" />
                {{ t('instructor.chapters.addLesson', 'Add Lesson') }}
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

      <CollapsibleContent>
        <CardContent class="pt-0">
          <!-- Description -->
          <p v-if="chapter.description" class="text-sm text-muted-foreground mb-4">
            {{ chapter.description }}
          </p>

          <!-- Lessons Slot -->
          <div class="space-y-2">
            <slot name="lessons" />
          </div>

          <!-- Add Lesson Button -->
          <Button
            variant="outline"
            size="sm"
            class="mt-4 w-full"
            @click="handleAddLesson"
          >
            <Plus class="mr-2 h-4 w-4" />
            {{ t('instructor.chapters.addLesson', 'Add Lesson') }}
          </Button>
        </CardContent>
      </CollapsibleContent>
    </Collapsible>
  </Card>
</template>

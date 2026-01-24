<script setup lang="ts">
import type { Lesson } from '@shared/types';
import LessonCard from './LessonCard.vue';
import { ref, watch } from 'vue';

interface Props {
  lessons: Lesson[];
  disabled?: boolean;
}

interface Emits {
  (e: 'reorder', lessonIds: string[]): void;
  (e: 'edit', lesson: Lesson): void;
  (e: 'delete', lesson: Lesson): void;
  (e: 'open', lesson: Lesson): void;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});
const emit = defineEmits<Emits>();

// Local state for drag and drop
const localLessons = ref<Lesson[]>([]);
const draggedIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

// Sync with props
watch(
  () => props.lessons,
  (lessons) => {
    localLessons.value = [...lessons];
  },
  { immediate: true }
);

function handleDragStart(index: number, event: DragEvent): void {
  if (props.disabled) return;

  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
  // Prevent the chapter from being dragged
  event.stopPropagation();
}

function handleDragOver(index: number, event: DragEvent): void {
  if (props.disabled) return;

  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dragOverIndex.value = index;
}

function handleDragLeave(): void {
  dragOverIndex.value = null;
}

function handleDrop(index: number, event: DragEvent): void {
  if (props.disabled) return;

  event.preventDefault();
  event.stopPropagation();

  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    const newLessons = [...localLessons.value];
    const [removed] = newLessons.splice(draggedIndex.value, 1);
    newLessons.splice(index, 0, removed);

    localLessons.value = newLessons;
    emit('reorder', newLessons.map((l) => l.id));
  }

  draggedIndex.value = null;
  dragOverIndex.value = null;
}

function handleDragEnd(): void {
  draggedIndex.value = null;
  dragOverIndex.value = null;
}

function handleEdit(lesson: Lesson): void {
  emit('edit', lesson);
}

function handleDelete(lesson: Lesson): void {
  emit('delete', lesson);
}

function handleOpen(lesson: Lesson): void {
  emit('open', lesson);
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(lesson, index) in localLessons"
      :key="lesson.id"
      :class="[
        'transition-all duration-200',
        dragOverIndex === index && draggedIndex !== index
          ? 'translate-y-1 opacity-50'
          : '',
      ]"
      draggable="true"
      @dragstart="handleDragStart(index, $event)"
      @dragover="handleDragOver(index, $event)"
      @dragleave="handleDragLeave"
      @drop="handleDrop(index, $event)"
      @dragend="handleDragEnd"
    >
      <LessonCard
        :lesson="lesson"
        :is-dragging="draggedIndex === index"
        @edit="handleEdit"
        @delete="handleDelete"
        @open="handleOpen"
      />
    </div>
  </div>
</template>

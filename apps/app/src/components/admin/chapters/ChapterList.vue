<script setup lang="ts">
import type { Chapter } from '@shared/types';
import ChapterCard from './ChapterCard.vue';
import { ref, watch } from 'vue';

interface Props {
  chapters: Chapter[];
  disabled?: boolean;
}

interface Emits {
  (e: 'reorder', chapterIds: string[]): void;
  (e: 'edit', chapter: Chapter): void;
  (e: 'delete', chapter: Chapter): void;
  (e: 'add-lesson', chapterId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});
const emit = defineEmits<Emits>();

// Local state for drag and drop
const localChapters = ref<Chapter[]>([]);
const draggedIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

// Sync with props
watch(
  () => props.chapters,
  (chapters) => {
    localChapters.value = [...chapters];
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
}

function handleDragOver(index: number, event: DragEvent): void {
  if (props.disabled) return;

  event.preventDefault();
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

  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    const newChapters = [...localChapters.value];
    const [removed] = newChapters.splice(draggedIndex.value, 1);
    newChapters.splice(index, 0, removed);

    localChapters.value = newChapters;
    emit('reorder', newChapters.map((c) => c.id));
  }

  draggedIndex.value = null;
  dragOverIndex.value = null;
}

function handleDragEnd(): void {
  draggedIndex.value = null;
  dragOverIndex.value = null;
}

function handleEdit(chapter: Chapter): void {
  emit('edit', chapter);
}

function handleDelete(chapter: Chapter): void {
  emit('delete', chapter);
}

function handleAddLesson(chapterId: string): void {
  emit('add-lesson', chapterId);
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="(chapter, index) in localChapters"
      :key="chapter.id"
      :class="[
        'transition-all duration-200',
        dragOverIndex === index && draggedIndex !== index
          ? 'translate-y-2 opacity-50'
          : '',
      ]"
      draggable="true"
      @dragstart="handleDragStart(index, $event)"
      @dragover="handleDragOver(index, $event)"
      @dragleave="handleDragLeave"
      @drop="handleDrop(index, $event)"
      @dragend="handleDragEnd"
    >
      <ChapterCard
        :chapter="chapter"
        :is-dragging="draggedIndex === index"
        @edit="handleEdit"
        @delete="handleDelete"
        @add-lesson="handleAddLesson"
      >
        <template #lessons>
          <slot name="lessons" :chapter="chapter" />
        </template>
      </ChapterCard>
    </div>
  </div>
</template>

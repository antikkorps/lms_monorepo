<script setup lang="ts">
import type { LessonType } from '@shared/types';
import { computed } from 'vue';
import { Video, FileQuestion, FileText, ClipboardList } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

interface Props {
  modelValue: LessonType;
}

interface Emits {
  (e: 'update:modelValue', value: LessonType): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();

const lessonTypes: { value: LessonType; label: string; icon: typeof Video }[] = [
  { value: 'video', label: t('instructor.lessonTypes.video', 'Video'), icon: Video },
  { value: 'quiz', label: t('instructor.lessonTypes.quiz', 'Quiz'), icon: FileQuestion },
  { value: 'document', label: t('instructor.lessonTypes.document', 'Document'), icon: FileText },
  { value: 'assignment', label: t('instructor.lessonTypes.assignment', 'Assignment'), icon: ClipboardList },
];

function selectType(type: LessonType): void {
  emit('update:modelValue', type);
}
</script>

<template>
  <div class="grid grid-cols-2 gap-2">
    <button
      v-for="type in lessonTypes"
      :key="type.value"
      type="button"
      :class="[
        'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
        modelValue === type.value
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50',
      ]"
      @click="selectType(type.value)"
    >
      <component :is="type.icon" class="h-6 w-6" />
      <span class="text-sm font-medium">{{ type.label }}</span>
    </button>
  </div>
</template>

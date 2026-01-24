<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Lesson, CreateLessonInput, UpdateLessonInput, LessonType } from '@shared/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import LessonTypeSelector from './LessonTypeSelector.vue';
import { Loader2 } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

interface Props {
  open: boolean;
  lesson?: Lesson | null;
  isSubmitting?: boolean;
}

interface Emits {
  (e: 'update:open', value: boolean): void;
  (e: 'submit', data: CreateLessonInput | UpdateLessonInput): void;
}

const props = withDefaults(defineProps<Props>(), {
  lesson: null,
  isSubmitting: false,
});
const emit = defineEmits<Emits>();
const { t } = useI18n();

const isEditMode = computed(() => !!props.lesson);

// Form state
const form = ref<CreateLessonInput>({
  title: '',
  type: 'video',
  duration: 0,
  isFree: false,
});

// Validation errors
const errors = ref<Partial<Record<keyof typeof form.value, string>>>({});

// Reset form when dialog opens
watch(
  () => props.open,
  (open) => {
    if (open) {
      if (props.lesson) {
        form.value = {
          title: props.lesson.title,
          type: props.lesson.type,
          duration: props.lesson.duration,
          isFree: props.lesson.isFree,
        };
      } else {
        form.value = {
          title: '',
          type: 'video',
          duration: 0,
          isFree: false,
        };
      }
      errors.value = {};
    }
  }
);

function validateForm(): boolean {
  errors.value = {};

  if (!form.value.title?.trim()) {
    errors.value.title = t('instructor.lessonForm.errors.titleRequired', 'Title is required');
  }

  return Object.keys(errors.value).length === 0;
}

function handleSubmit(): void {
  if (!validateForm()) {
    return;
  }

  emit('submit', {
    title: form.value.title.trim(),
    type: form.value.type,
    duration: form.value.duration || 0,
    isFree: form.value.isFree,
  });
}

function handleClose(): void {
  emit('update:open', false);
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {{
            isEditMode
              ? t('instructor.lessonForm.editTitle', 'Edit Lesson')
              : t('instructor.lessonForm.createTitle', 'Add Lesson')
          }}
        </DialogTitle>
        <DialogDescription>
          {{
            isEditMode
              ? t('instructor.lessonForm.editDescription', 'Update the lesson details')
              : t('instructor.lessonForm.createDescription', 'Create a new lesson for this chapter')
          }}
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Title -->
        <div class="space-y-2">
          <Label for="lesson-title">
            {{ t('instructor.lessonForm.title', 'Title') }}
            <span class="text-destructive">*</span>
          </Label>
          <Input
            id="lesson-title"
            v-model="form.title"
            :placeholder="t('instructor.lessonForm.titlePlaceholder', 'e.g., Introduction to the course')"
            :class="{ 'border-destructive': errors.title }"
          />
          <p v-if="errors.title" class="text-sm text-destructive">{{ errors.title }}</p>
        </div>

        <!-- Type -->
        <div class="space-y-2">
          <Label>{{ t('instructor.lessonForm.type', 'Lesson Type') }}</Label>
          <LessonTypeSelector v-model="form.type" />
        </div>

        <!-- Duration -->
        <div class="space-y-2">
          <Label for="lesson-duration">
            {{ t('instructor.lessonForm.duration', 'Duration (minutes)') }}
          </Label>
          <Input
            id="lesson-duration"
            v-model.number="form.duration"
            type="number"
            min="0"
            :placeholder="t('instructor.lessonForm.durationPlaceholder', '0')"
          />
        </div>

        <!-- Is Free -->
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label for="lesson-free">{{ t('instructor.lessonForm.isFree', 'Free Preview') }}</Label>
            <p class="text-sm text-muted-foreground">
              {{ t('instructor.lessonForm.isFreeDescription', 'Allow non-enrolled users to view this lesson') }}
            </p>
          </div>
          <Switch id="lesson-free" v-model:checked="form.isFree" />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" @click="handleClose">
            {{ t('common.cancel', 'Cancel') }}
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
            {{
              isEditMode
                ? t('common.save', 'Save')
                : t('common.create', 'Create')
            }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

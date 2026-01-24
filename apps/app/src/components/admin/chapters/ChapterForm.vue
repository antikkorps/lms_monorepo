<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Chapter, CreateChapterInput, UpdateChapterInput } from '@shared/types';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

interface Props {
  open: boolean;
  chapter?: Chapter | null;
  isSubmitting?: boolean;
}

interface Emits {
  (e: 'update:open', value: boolean): void;
  (e: 'submit', data: CreateChapterInput | UpdateChapterInput): void;
}

const props = withDefaults(defineProps<Props>(), {
  chapter: null,
  isSubmitting: false,
});
const emit = defineEmits<Emits>();
const { t } = useI18n();

const isEditMode = computed(() => !!props.chapter);

// Form state
const form = ref<CreateChapterInput>({
  title: '',
  description: '',
});

// Validation errors
const errors = ref<Partial<Record<keyof typeof form.value, string>>>({});

// Reset form when dialog opens
watch(
  () => props.open,
  (open) => {
    if (open) {
      if (props.chapter) {
        form.value = {
          title: props.chapter.title,
          description: props.chapter.description || '',
        };
      } else {
        form.value = {
          title: '',
          description: '',
        };
      }
      errors.value = {};
    }
  }
);

function validateForm(): boolean {
  errors.value = {};

  if (!form.value.title?.trim()) {
    errors.value.title = t('instructor.chapterForm.errors.titleRequired', 'Title is required');
  }

  return Object.keys(errors.value).length === 0;
}

function handleSubmit(): void {
  if (!validateForm()) {
    return;
  }

  emit('submit', {
    title: form.value.title.trim(),
    description: form.value.description?.trim() || null,
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
              ? t('instructor.chapterForm.editTitle', 'Edit Chapter')
              : t('instructor.chapterForm.createTitle', 'Add Chapter')
          }}
        </DialogTitle>
        <DialogDescription>
          {{
            isEditMode
              ? t('instructor.chapterForm.editDescription', 'Update the chapter details')
              : t('instructor.chapterForm.createDescription', 'Create a new chapter for your course')
          }}
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Title -->
        <div class="space-y-2">
          <Label for="chapter-title">
            {{ t('instructor.chapterForm.title', 'Title') }}
            <span class="text-destructive">*</span>
          </Label>
          <Input
            id="chapter-title"
            v-model="form.title"
            :placeholder="t('instructor.chapterForm.titlePlaceholder', 'e.g., Getting Started')"
            :class="{ 'border-destructive': errors.title }"
          />
          <p v-if="errors.title" class="text-sm text-destructive">{{ errors.title }}</p>
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <Label for="chapter-description">
            {{ t('instructor.chapterForm.description', 'Description') }}
          </Label>
          <Textarea
            id="chapter-description"
            v-model="form.description"
            :placeholder="t('instructor.chapterForm.descriptionPlaceholder', 'Brief description of this chapter...')"
            rows="3"
          />
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

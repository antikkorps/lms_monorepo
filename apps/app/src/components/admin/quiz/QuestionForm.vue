<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { QuizQuestion, CreateQuestionInput, UpdateQuestionInput } from '@shared/types';
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
import OptionEditor from './OptionEditor.vue';
import { Loader2, Plus, AlertCircle } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

interface Props {
  open: boolean;
  question?: QuizQuestion | null;
  isSubmitting?: boolean;
}

interface Emits {
  (e: 'update:open', value: boolean): void;
  (e: 'submit', data: CreateQuestionInput | UpdateQuestionInput): void;
}

const props = withDefaults(defineProps<Props>(), {
  question: null,
  isSubmitting: false,
});
const emit = defineEmits<Emits>();
const { t } = useI18n();

const isEditMode = computed(() => !!props.question);

// Form state
interface OptionInput {
  text: string;
  isCorrect: boolean;
}

const form = ref<{
  question: string;
  options: OptionInput[];
  explanation: string;
}>({
  question: '',
  options: [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
  explanation: '',
});

// Validation errors
const errors = ref<{
  question?: string;
  options?: string;
}>({});

// Reset form when dialog opens
watch(
  () => props.open,
  (open) => {
    if (open) {
      if (props.question) {
        form.value = {
          question: props.question.question,
          options: props.question.options.map((o) => ({
            text: o.text,
            isCorrect: o.isCorrect,
          })),
          explanation: props.question.explanation || '',
        };
      } else {
        form.value = {
          question: '',
          options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
          ],
          explanation: '',
        };
      }
      errors.value = {};
    }
  }
);

const canDeleteOption = computed(() => form.value.options.length > 2);
const canAddOption = computed(() => form.value.options.length < 6);
const hasCorrectOption = computed(() =>
  form.value.options.some((o) => o.isCorrect)
);

function addOption(): void {
  if (canAddOption.value) {
    form.value.options.push({ text: '', isCorrect: false });
  }
}

function updateOption(index: number, option: OptionInput): void {
  form.value.options[index] = option;
}

function deleteOption(index: number): void {
  if (canDeleteOption.value) {
    form.value.options.splice(index, 1);
  }
}

function validateForm(): boolean {
  errors.value = {};

  if (!form.value.question?.trim()) {
    errors.value.question = t(
      'instructor.quiz.errors.questionRequired',
      'Question is required'
    );
  }

  const filledOptions = form.value.options.filter((o) => o.text.trim());
  if (filledOptions.length < 2) {
    errors.value.options = t(
      'instructor.quiz.errors.minOptions',
      'At least 2 options are required'
    );
  } else if (!hasCorrectOption.value) {
    errors.value.options = t(
      'instructor.quiz.errors.noCorrect',
      'At least one option must be marked as correct'
    );
  }

  return Object.keys(errors.value).length === 0;
}

function handleSubmit(): void {
  if (!validateForm()) {
    return;
  }

  const input: CreateQuestionInput = {
    question: form.value.question.trim(),
    options: form.value.options
      .filter((o) => o.text.trim())
      .map((o) => ({
        text: o.text.trim(),
        isCorrect: o.isCorrect,
      })),
    explanation: form.value.explanation?.trim() || null,
  };

  emit('submit', input);
}

function handleClose(): void {
  emit('update:open', false);
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{
            isEditMode
              ? t('instructor.quiz.editQuestion', 'Edit Question')
              : t('instructor.quiz.addQuestion', 'Add Question')
          }}
        </DialogTitle>
        <DialogDescription>
          {{
            isEditMode
              ? t('instructor.quiz.editQuestionDescription', 'Update the question and its options')
              : t('instructor.quiz.addQuestionDescription', 'Create a new quiz question with multiple choice options')
          }}
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Question -->
        <div class="space-y-2">
          <Label for="question-text">
            {{ t('instructor.quiz.questionLabel', 'Question') }}
            <span class="text-destructive">*</span>
          </Label>
          <Textarea
            id="question-text"
            v-model="form.question"
            :placeholder="t('instructor.quiz.questionPlaceholder', 'Enter your question...')"
            :class="{ 'border-destructive': errors.question }"
            rows="3"
          />
          <p v-if="errors.question" class="text-sm text-destructive">
            {{ errors.question }}
          </p>
        </div>

        <!-- Options -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <Label>
              {{ t('instructor.quiz.optionsLabel', 'Options') }}
              <span class="text-destructive">*</span>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="!canAddOption"
              @click="addOption"
            >
              <Plus class="mr-2 h-4 w-4" />
              {{ t('instructor.quiz.addOption', 'Add Option') }}
            </Button>
          </div>

          <div class="space-y-2">
            <OptionEditor
              v-for="(option, index) in form.options"
              :key="index"
              :option="option"
              :index="index"
              :can-delete="canDeleteOption"
              @update="updateOption(index, $event)"
              @delete="deleteOption(index)"
            />
          </div>

          <div
            v-if="errors.options"
            class="flex items-center gap-2 text-sm text-destructive"
          >
            <AlertCircle class="h-4 w-4" />
            {{ errors.options }}
          </div>

          <p class="text-sm text-muted-foreground">
            {{ t('instructor.quiz.optionsHint', 'Check the box next to correct answer(s). You can have multiple correct answers.') }}
          </p>
        </div>

        <!-- Explanation -->
        <div class="space-y-2">
          <Label for="question-explanation">
            {{ t('instructor.quiz.explanationLabel', 'Explanation (optional)') }}
          </Label>
          <Textarea
            id="question-explanation"
            v-model="form.explanation"
            :placeholder="t('instructor.quiz.explanationPlaceholder', 'Explain why the correct answer is correct...')"
            rows="2"
          />
          <p class="text-sm text-muted-foreground">
            {{ t('instructor.quiz.explanationHint', 'This will be shown to learners after they answer the question.') }}
          </p>
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

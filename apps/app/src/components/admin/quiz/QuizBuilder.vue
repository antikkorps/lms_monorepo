<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { QuizQuestion, CreateQuestionInput, UpdateQuestionInput } from '@shared/types';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import QuestionCard from './QuestionCard.vue';
import QuestionForm from './QuestionForm.vue';
import { useQuizBuilder } from '@/composables/useQuizBuilder';
import {
  Plus,
  AlertCircle,
  Loader2,
  HelpCircle,
  GripVertical,
} from 'lucide-vue-next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';

interface Props {
  lessonId: string;
}

const props = defineProps<Props>();
const { t } = useI18n();

const {
  isLoading,
  isSaving,
  error,
  questions,
  hasQuestions,
  questionsCount,
  fetchQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} = useQuizBuilder(props.lessonId);

// Dialog states
const isFormOpen = ref(false);
const editingQuestion = ref<QuizQuestion | null>(null);
const isDeleteDialogOpen = ref(false);
const questionToDelete = ref<QuizQuestion | null>(null);

// Drag and drop state
const draggedIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

// Initialize
onMounted(() => {
  fetchQuestions();
});

function handleAddQuestion(): void {
  editingQuestion.value = null;
  isFormOpen.value = true;
}

function handleEditQuestion(question: QuizQuestion): void {
  editingQuestion.value = question;
  isFormOpen.value = true;
}

function confirmDeleteQuestion(question: QuizQuestion): void {
  questionToDelete.value = question;
  isDeleteDialogOpen.value = true;
}

async function handleDeleteQuestion(): Promise<void> {
  if (!questionToDelete.value) return;

  const success = await deleteQuestion(questionToDelete.value.id);
  if (success) {
    toast.success(t('instructor.quiz.deleteSuccess', 'Question deleted'));
  } else {
    toast.error(t('instructor.quiz.deleteError', 'Failed to delete question'));
  }
  isDeleteDialogOpen.value = false;
  questionToDelete.value = null;
}

async function handleQuestionSubmit(
  data: CreateQuestionInput | UpdateQuestionInput
): Promise<void> {
  if (editingQuestion.value) {
    const question = await updateQuestion(editingQuestion.value.id, data);
    if (question) {
      toast.success(t('instructor.quiz.updateSuccess', 'Question updated'));
      isFormOpen.value = false;
    } else {
      toast.error(t('instructor.quiz.updateError', 'Failed to update question'));
    }
  } else {
    const question = await createQuestion(data as CreateQuestionInput);
    if (question) {
      toast.success(t('instructor.quiz.createSuccess', 'Question created'));
      isFormOpen.value = false;
    } else {
      toast.error(t('instructor.quiz.createError', 'Failed to create question'));
    }
  }
}

// Drag and drop handlers
function handleDragStart(index: number, event: DragEvent): void {
  if (isSaving.value) return;

  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
}

function handleDragOver(index: number, event: DragEvent): void {
  if (isSaving.value) return;

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dragOverIndex.value = index;
}

function handleDragLeave(): void {
  dragOverIndex.value = null;
}

async function handleDrop(index: number, event: DragEvent): Promise<void> {
  if (isSaving.value) return;

  event.preventDefault();

  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    const newQuestions = [...questions.value];
    const [removed] = newQuestions.splice(draggedIndex.value, 1);
    newQuestions.splice(index, 0, removed);

    const success = await reorderQuestions(newQuestions.map((q) => q.id));
    if (!success) {
      toast.error(t('instructor.quiz.reorderError', 'Failed to reorder questions'));
    }
  }

  draggedIndex.value = null;
  dragOverIndex.value = null;
}

function handleDragEnd(): void {
  draggedIndex.value = null;
  dragOverIndex.value = null;
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-muted-foreground">
          {{ questionsCount }}
          {{ t('instructor.quiz.questionsCount', 'questions') }}
        </p>
      </div>
      <Button @click="handleAddQuestion">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('instructor.quiz.addQuestion', 'Add Question') }}
      </Button>
    </div>

    <!-- Loading State -->
    <Card v-if="isLoading" class="animate-pulse">
      <CardContent class="py-12 flex items-center justify-center">
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">
            {{ t('instructor.quiz.loadError', 'Failed to load questions') }}
          </p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchQuestions">
          {{ t('common.retry', 'Retry') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Empty State -->
    <Card v-else-if="!hasQuestions">
      <CardContent class="flex flex-col items-center justify-center py-12 text-center">
        <HelpCircle class="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 class="mb-2 text-lg font-semibold">
          {{ t('instructor.quiz.noQuestions', 'No questions yet') }}
        </h3>
        <p class="mb-4 text-muted-foreground">
          {{ t('instructor.quiz.noQuestionsDescription', 'Add questions to create your quiz.') }}
        </p>
        <Button @click="handleAddQuestion">
          <Plus class="mr-2 h-4 w-4" />
          {{ t('instructor.quiz.addQuestion', 'Add Question') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Questions List -->
    <div v-else class="space-y-3">
      <div
        v-for="(question, index) in questions"
        :key="question.id"
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
        <QuestionCard
          :question="question"
          :index="index"
          :is-dragging="draggedIndex === index"
          @edit="handleEditQuestion"
          @delete="confirmDeleteQuestion"
        />
      </div>
    </div>

    <!-- Question Form Dialog -->
    <QuestionForm
      v-model:open="isFormOpen"
      :question="editingQuestion"
      :is-submitting="isSaving"
      @submit="handleQuestionSubmit"
    />

    <!-- Delete Confirmation Dialog -->
    <AlertDialog v-model:open="isDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{ t('instructor.quiz.deleteDialog.title', 'Delete Question') }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('instructor.quiz.deleteDialog.description', 'Are you sure you want to delete this question? This action cannot be undone.') }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.cancel', 'Cancel') }}</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="handleDeleteQuestion"
          >
            {{ t('common.delete', 'Delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

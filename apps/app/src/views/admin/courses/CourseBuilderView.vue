<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Chapter, Lesson, CreateChapterInput, CreateLessonInput, UpdateChapterInput, UpdateLessonInput } from '@shared/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChapterList,
  ChapterForm,
  LessonList,
  LessonForm,
} from '@/components/admin';
import { CourseStatusBadge } from '@/components/admin';
import { useCourseEditor } from '@/composables/useCourseEditor';
import { useChapterManager } from '@/composables/useChapterManager';
import { useLessonManager } from '@/composables/useLessonManager';
import {
  ArrowLeft,
  Plus,
  AlertCircle,
  Loader2,
  BookOpen,
  Pencil,
  Send,
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

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const courseId = computed(() => route.params.id as string);

// Composables
const {
  isLoading: isLoadingCourse,
  isSaving: isSavingCourse,
  currentCourse,
  fetchCourse,
  publishCourse,
} = useCourseEditor();

const chapterManager = useChapterManager(courseId.value);
const lessonManager = useLessonManager(courseId.value);

// Dialog states
const isChapterFormOpen = ref(false);
const isLessonFormOpen = ref(false);
const editingChapter = ref<Chapter | null>(null);
const editingLesson = ref<Lesson | null>(null);
const currentChapterId = ref<string | null>(null);

// Delete confirmation
const isDeleteChapterDialogOpen = ref(false);
const isDeleteLessonDialogOpen = ref(false);
const chapterToDelete = ref<Chapter | null>(null);
const lessonToDelete = ref<Lesson | null>(null);

// Overall loading state
const isLoading = computed(
  () => isLoadingCourse.value || chapterManager.isLoading.value
);

// Initialize
onMounted(async () => {
  await fetchCourse(courseId.value);
  await chapterManager.fetchChapters();

  // Fetch lessons for all chapters
  if (chapterManager.chapters.value.length > 0) {
    await lessonManager.fetchAllLessons(
      chapterManager.chapters.value.map((c) => c.id)
    );
  }
});

// Watch for chapter changes to fetch lessons
watch(
  () => chapterManager.chapters.value,
  async (chapters, oldChapters) => {
    const newChapterIds = chapters.map((c) => c.id);
    const oldChapterIds = oldChapters?.map((c) => c.id) || [];
    const addedChapterIds = newChapterIds.filter((id) => !oldChapterIds.includes(id));

    if (addedChapterIds.length > 0) {
      await lessonManager.fetchAllLessons(addedChapterIds);
    }
  }
);

function handleGoBack(): void {
  router.push({ name: 'instructor-courses' });
}

function handleEditCourse(): void {
  router.push({ name: 'instructor-course-edit', params: { id: courseId.value } });
}

async function handlePublishCourse(): Promise<void> {
  const success = await publishCourse(courseId.value);
  if (success) {
    toast.success(t('instructor.courses.publishSuccess', 'Course published successfully'));
  } else {
    toast.error(t('instructor.courses.publishError', 'Failed to publish course'));
  }
}

// Chapter handlers
function handleAddChapter(): void {
  editingChapter.value = null;
  isChapterFormOpen.value = true;
}

function handleEditChapter(chapter: Chapter): void {
  editingChapter.value = chapter;
  isChapterFormOpen.value = true;
}

function confirmDeleteChapter(chapter: Chapter): void {
  chapterToDelete.value = chapter;
  isDeleteChapterDialogOpen.value = true;
}

async function handleDeleteChapter(): Promise<void> {
  if (!chapterToDelete.value) return;

  const success = await chapterManager.deleteChapter(chapterToDelete.value.id);
  if (success) {
    toast.success(t('instructor.chapters.deleteSuccess', 'Chapter deleted'));
  } else {
    toast.error(t('instructor.chapters.deleteError', 'Failed to delete chapter'));
  }
  isDeleteChapterDialogOpen.value = false;
  chapterToDelete.value = null;
}

async function handleChapterSubmit(
  data: CreateChapterInput | UpdateChapterInput
): Promise<void> {
  if (editingChapter.value) {
    const chapter = await chapterManager.updateChapter(editingChapter.value.id, data);
    if (chapter) {
      toast.success(t('instructor.chapters.updateSuccess', 'Chapter updated'));
      isChapterFormOpen.value = false;
    } else {
      toast.error(t('instructor.chapters.updateError', 'Failed to update chapter'));
    }
  } else {
    const chapter = await chapterManager.createChapter(data as CreateChapterInput);
    if (chapter) {
      toast.success(t('instructor.chapters.createSuccess', 'Chapter created'));
      isChapterFormOpen.value = false;
    } else {
      toast.error(t('instructor.chapters.createError', 'Failed to create chapter'));
    }
  }
}

async function handleReorderChapters(chapterIds: string[]): Promise<void> {
  const success = await chapterManager.reorderChapters(chapterIds);
  if (!success) {
    toast.error(t('instructor.chapters.reorderError', 'Failed to reorder chapters'));
  }
}

// Lesson handlers
function handleAddLesson(chapterId: string): void {
  currentChapterId.value = chapterId;
  editingLesson.value = null;
  isLessonFormOpen.value = true;
}

function handleEditLesson(lesson: Lesson): void {
  editingLesson.value = lesson;
  isLessonFormOpen.value = true;
}

function handleOpenLesson(lesson: Lesson): void {
  router.push({ name: 'instructor-lesson-edit', params: { id: lesson.id } });
}

function confirmDeleteLesson(lesson: Lesson): void {
  lessonToDelete.value = lesson;
  isDeleteLessonDialogOpen.value = true;
}

async function handleDeleteLesson(): Promise<void> {
  if (!lessonToDelete.value) return;

  const success = await lessonManager.deleteLesson(lessonToDelete.value.id);
  if (success) {
    toast.success(t('instructor.lessons.deleteSuccess', 'Lesson deleted'));
  } else {
    toast.error(t('instructor.lessons.deleteError', 'Failed to delete lesson'));
  }
  isDeleteLessonDialogOpen.value = false;
  lessonToDelete.value = null;
}

async function handleLessonSubmit(
  data: CreateLessonInput | UpdateLessonInput
): Promise<void> {
  if (editingLesson.value) {
    const lesson = await lessonManager.updateLesson(editingLesson.value.id, data);
    if (lesson) {
      toast.success(t('instructor.lessons.updateSuccess', 'Lesson updated'));
      isLessonFormOpen.value = false;
    } else {
      toast.error(t('instructor.lessons.updateError', 'Failed to update lesson'));
    }
  } else if (currentChapterId.value) {
    const lesson = await lessonManager.createLesson(
      currentChapterId.value,
      data as CreateLessonInput
    );
    if (lesson) {
      toast.success(t('instructor.lessons.createSuccess', 'Lesson created'));
      isLessonFormOpen.value = false;
    } else {
      toast.error(t('instructor.lessons.createError', 'Failed to create lesson'));
    }
  }
}

async function handleReorderLessons(
  chapterId: string,
  lessonIds: string[]
): Promise<void> {
  const success = await lessonManager.reorderLessons(chapterId, lessonIds);
  if (!success) {
    toast.error(t('instructor.lessons.reorderError', 'Failed to reorder lessons'));
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="handleGoBack">
        <ArrowLeft class="h-5 w-5" />
      </Button>
      <div class="flex-1">
        <div class="flex items-center gap-3">
          <h1 class="text-3xl font-bold tracking-tight">
            {{ currentCourse?.title || t('instructor.courseBuilder.title', 'Course Builder') }}
          </h1>
          <CourseStatusBadge v-if="currentCourse" :status="currentCourse.status" />
        </div>
        <p class="text-muted-foreground">
          {{ t('instructor.courseBuilder.subtitle', 'Manage chapters and lessons') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" @click="handleEditCourse">
          <Pencil class="mr-2 h-4 w-4" />
          {{ t('instructor.courseBuilder.editDetails', 'Edit Details') }}
        </Button>
        <Button
          v-if="currentCourse?.status === 'draft'"
          @click="handlePublishCourse"
          :disabled="isSavingCourse"
        >
          <Send class="mr-2 h-4 w-4" />
          {{ t('instructor.courseBuilder.publish', 'Publish') }}
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <Card v-if="isLoading" class="animate-pulse">
      <CardContent class="py-12 flex items-center justify-center">
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>

    <!-- Error State -->
    <Card
      v-else-if="chapterManager.error.value"
      class="border-destructive"
    >
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">
            {{ t('instructor.courseBuilder.loadError', 'Failed to load course content') }}
          </p>
          <p class="text-sm text-muted-foreground">{{ chapterManager.error.value }}</p>
        </div>
        <Button
          variant="outline"
          class="ml-auto"
          @click="chapterManager.fetchChapters()"
        >
          {{ t('common.retry', 'Retry') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Content -->
    <template v-else>
      <!-- Empty State -->
      <Card v-if="!chapterManager.hasChapters.value">
        <CardContent class="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen class="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 class="mb-2 text-lg font-semibold">
            {{ t('instructor.courseBuilder.noChapters', 'No chapters yet') }}
          </h3>
          <p class="mb-4 text-muted-foreground">
            {{
              t(
                'instructor.courseBuilder.noChaptersDescription',
                'Start building your course by adding chapters.'
              )
            }}
          </p>
          <Button @click="handleAddChapter">
            <Plus class="mr-2 h-4 w-4" />
            {{ t('instructor.courseBuilder.addChapter', 'Add Chapter') }}
          </Button>
        </CardContent>
      </Card>

      <!-- Chapters List -->
      <template v-else>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">
            {{ t('instructor.courseBuilder.chapters', 'Chapters') }}
          </h2>
          <Button @click="handleAddChapter">
            <Plus class="mr-2 h-4 w-4" />
            {{ t('instructor.courseBuilder.addChapter', 'Add Chapter') }}
          </Button>
        </div>

        <ChapterList
          :chapters="chapterManager.chapters.value"
          :disabled="chapterManager.isSaving.value"
          @reorder="handleReorderChapters"
          @edit="handleEditChapter"
          @delete="confirmDeleteChapter"
          @add-lesson="handleAddLesson"
        >
          <template #lessons="{ chapter }">
            <LessonList
              :lessons="lessonManager.getLessonsForChapter(chapter.id)"
              :disabled="lessonManager.isSaving.value"
              @reorder="(ids) => handleReorderLessons(chapter.id, ids)"
              @edit="handleEditLesson"
              @delete="confirmDeleteLesson"
              @open="handleOpenLesson"
            />
          </template>
        </ChapterList>
      </template>
    </template>

    <!-- Chapter Form Dialog -->
    <ChapterForm
      v-model:open="isChapterFormOpen"
      :chapter="editingChapter"
      :is-submitting="chapterManager.isSaving.value"
      @submit="handleChapterSubmit"
    />

    <!-- Lesson Form Dialog -->
    <LessonForm
      v-model:open="isLessonFormOpen"
      :lesson="editingLesson"
      :is-submitting="lessonManager.isSaving.value"
      @submit="handleLessonSubmit"
    />

    <!-- Delete Chapter Confirmation -->
    <AlertDialog v-model:open="isDeleteChapterDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{ t('instructor.chapters.deleteDialog.title', 'Delete Chapter') }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {{
              t(
                'instructor.chapters.deleteDialog.description',
                'This will delete the chapter and all its lessons. This action cannot be undone.'
              )
            }}
            <span v-if="chapterToDelete" class="block mt-2 font-medium text-foreground">
              "{{ chapterToDelete.title }}"
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.cancel', 'Cancel') }}</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="handleDeleteChapter"
          >
            {{ t('common.delete', 'Delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Delete Lesson Confirmation -->
    <AlertDialog v-model:open="isDeleteLessonDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{ t('instructor.lessons.deleteDialog.title', 'Delete Lesson') }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {{
              t(
                'instructor.lessons.deleteDialog.description',
                'Are you sure you want to delete this lesson? This action cannot be undone.'
              )
            }}
            <span v-if="lessonToDelete" class="block mt-2 font-medium text-foreground">
              "{{ lessonToDelete.title }}"
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.cancel', 'Cancel') }}</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="handleDeleteLesson"
          >
            {{ t('common.delete', 'Delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

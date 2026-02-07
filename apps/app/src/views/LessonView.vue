<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  HelpCircle,
  FileText,
  Edit3,
  CheckCircle2,
  MessageSquare,
  StickyNote,
  Loader2,
  AlertCircle,
} from 'lucide-vue-next';
import { useCourseDetail } from '@/composables/useCourseDetail';
import { usePreview } from '@/composables/usePreview';
import { useProgress } from '@/composables/useProgress';
import { useToast } from '@/composables/useToast';
import { QuizEngine } from '@/components/quiz';
import { DiscussionSection } from '@/components/discussions';
import { NoteEditor } from '@/components/notes';
import { PreviewBanner } from '@/components/preview';
import VideoPlayer from '@/components/video/VideoPlayer.vue';
import type { LessonItem } from '@shared/types';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const courseSlug = computed(() => route.params.slug as string);
const lessonId = computed(() => route.params.lessonId as string);

// Preview mode
const { isPreviewMode, exitPreview } = usePreview();

const {
  isLoading: courseLoading,
  error: courseError,
  course,
  isEnrolled,
  fetchCourse,
  formatDuration,
  isLessonCompleted,
} = useCourseDetail(courseSlug.value, { previewMode: isPreviewMode.value });

const { markLessonComplete } = useProgress();
const isMarking = ref(false);

// Current tab
type Tab = 'content' | 'notes' | 'discussions';
const activeTab = ref<Tab>('content');

// Find current lesson
const currentLesson = computed(() => {
  if (!course.value) return null;
  for (const chapter of course.value.chapters) {
    const lesson = chapter.lessons.find((l) => l.id === lessonId.value);
    if (lesson) return lesson;
  }
  return null;
});

// Find current chapter
const currentChapter = computed(() => {
  if (!course.value || !currentLesson.value) return null;
  return course.value.chapters.find((c) =>
    c.lessons.some((l) => l.id === lessonId.value)
  );
});

// Build flat list of all lessons for navigation
const allLessons = computed(() => {
  if (!course.value) return [];
  const lessons: Array<LessonItem & { chapterId: string; chapterTitle: string }> = [];
  for (const chapter of course.value.chapters) {
    for (const lesson of chapter.lessons) {
      lessons.push({
        ...lesson,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
      });
    }
  }
  return lessons;
});

// Current lesson index
const currentIndex = computed(() =>
  allLessons.value.findIndex((l) => l.id === lessonId.value)
);

// Previous/Next lesson
const previousLesson = computed(() =>
  currentIndex.value > 0 ? allLessons.value[currentIndex.value - 1] : null
);

const nextLesson = computed(() =>
  currentIndex.value < allLessons.value.length - 1
    ? allLessons.value[currentIndex.value + 1]
    : null
);

// Is current lesson completed
const isCompleted = computed(() =>
  currentLesson.value ? isLessonCompleted(currentLesson.value.id) : false
);

onMounted(() => {
  fetchCourse();
});

// Watch for lesson changes to reset tab
watch(lessonId, () => {
  activeTab.value = 'content';
});

function getLessonIcon(type: LessonItem['type']) {
  switch (type) {
    case 'video':
      return PlayCircle;
    case 'quiz':
      return HelpCircle;
    case 'document':
      return FileText;
    case 'assignment':
      return Edit3;
    default:
      return PlayCircle;
  }
}

async function handleMarkComplete() {
  if (!course.value || !currentLesson.value) return;

  isMarking.value = true;
  const success = await markLessonComplete(course.value.id, currentLesson.value.id);
  isMarking.value = false;

  if (success) {
    toast.success(t('courses.lesson.toast.markedComplete'));
    // Refresh course data to update progress
    fetchCourse();
  }
}

function navigateToLesson(lesson: LessonItem) {
  const basePath = `/courses/${courseSlug.value}/learn/${lesson.id}`;
  router.push(isPreviewMode.value ? `${basePath}?preview=true` : basePath);
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Preview Banner -->
    <PreviewBanner
      v-if="isPreviewMode"
      :course-title="course?.title"
      @exit="exitPreview"
    />

    <!-- Header -->
    <header class="sticky z-40 border-b bg-background/95 backdrop-blur" :class="isPreviewMode ? 'top-[49px]' : 'top-0'">
      <div class="container px-4 sm:px-6 lg:px-8 mx-auto flex h-14 items-center gap-4">
        <RouterLink
          :to="`/courses/${courseSlug}`"
          class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft class="h-4 w-4" />
          <span class="hidden sm:inline">{{ t('courses.lesson.backToCourse') }}</span>
        </RouterLink>

        <div v-if="course && currentLesson" class="flex-1 min-w-0">
          <h1 class="truncate text-sm font-medium">{{ currentLesson.title }}</h1>
          <p class="truncate text-xs text-muted-foreground">
            {{ currentChapter?.title }}
          </p>
        </div>

        <!-- Navigation -->
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="!previousLesson"
            @click="previousLesson && navigateToLesson(previousLesson)"
          >
            <ChevronLeft class="h-4 w-4" />
            <span class="hidden sm:inline ml-1">{{ t('courses.lesson.nav.prev') }}</span>
          </Button>
          <span class="text-xs text-muted-foreground">
            {{ currentIndex + 1 }} / {{ allLessons.length }}
          </span>
          <Button
            variant="outline"
            size="sm"
            :disabled="!nextLesson"
            @click="nextLesson && navigateToLesson(nextLesson)"
          >
            <span class="hidden sm:inline mr-1">{{ t('courses.lesson.nav.next') }}</span>
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>

    <div class="container px-4 sm:px-6 lg:px-8 py-6 mx-auto">
      <!-- Loading -->
      <div v-if="courseLoading" class="flex items-center justify-center py-20">
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <!-- Error -->
      <Card v-else-if="courseError" class="border-destructive">
        <CardContent class="flex items-center gap-4 py-6">
          <AlertCircle class="h-8 w-8 text-destructive" />
          <div>
            <p class="font-medium">{{ t('courses.lesson.error.loadFailed') }}</p>
            <p class="text-sm text-muted-foreground">{{ courseError }}</p>
          </div>
          <RouterLink :to="`/courses/${courseSlug}`" class="ml-auto">
            <Button variant="outline">{{ t('courses.lesson.backToCourse') }}</Button>
          </RouterLink>
        </CardContent>
      </Card>

      <!-- Not enrolled -->
      <Card v-else-if="course && !isEnrolled" class="border-yellow-500">
        <CardContent class="flex items-center gap-4 py-6">
          <AlertCircle class="h-8 w-8 text-yellow-500" />
          <div>
            <p class="font-medium">{{ t('courses.enrollment.notEnrolled') }}</p>
            <p class="text-sm text-muted-foreground">
              {{ t('courses.enrollment.notEnrolledMessage') }}
            </p>
          </div>
          <RouterLink :to="`/courses/${courseSlug}`" class="ml-auto">
            <Button>{{ t('courses.enrollment.enroll') }}</Button>
          </RouterLink>
        </CardContent>
      </Card>

      <!-- Lesson not found -->
      <Card v-else-if="course && !currentLesson">
        <CardContent class="flex items-center gap-4 py-6">
          <AlertCircle class="h-8 w-8 text-muted-foreground" />
          <div>
            <p class="font-medium">{{ t('courses.lesson.notFound.title') }}</p>
            <p class="text-sm text-muted-foreground">
              {{ t('courses.lesson.notFound.message') }}
            </p>
          </div>
          <RouterLink :to="`/courses/${courseSlug}`" class="ml-auto">
            <Button variant="outline">{{ t('courses.lesson.backToCourse') }}</Button>
          </RouterLink>
        </CardContent>
      </Card>

      <!-- Main content -->
      <div v-else-if="course && currentLesson" class="grid gap-6 lg:grid-cols-[1fr_320px] max-w-6xl mx-auto">
        <!-- Main area -->
        <div class="space-y-6 max-w-3xl">
          <!-- Tabs -->
          <div class="flex border-b">
            <button
              class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              :class="activeTab === 'content'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'"
              @click="activeTab = 'content'"
            >
              <component :is="getLessonIcon(currentLesson.type)" class="inline h-4 w-4 mr-1.5" />
              {{ t('courses.lesson.lesson') }}
            </button>
            <button
              class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              :class="activeTab === 'notes'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'"
              @click="activeTab = 'notes'"
            >
              <StickyNote class="inline h-4 w-4 mr-1.5" />
              {{ t('courses.lesson.notes') }}
            </button>
            <button
              class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              :class="activeTab === 'discussions'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'"
              @click="activeTab = 'discussions'"
            >
              <MessageSquare class="inline h-4 w-4 mr-1.5" />
              {{ t('courses.lesson.discussions') }}
            </button>
          </div>

          <!-- Tab content -->
          <div>
            <!-- Lesson Content -->
            <div v-show="activeTab === 'content'">
              <!-- Video Player -->
              <div v-if="currentLesson.type === 'video'" class="space-y-4">
                <div class="aspect-video overflow-hidden rounded-lg bg-black">
                  <!-- HLS Playback URL (transcoded video) -->
                  <VideoPlayer
                    v-if="currentLesson.videoPlaybackUrl"
                    :src="currentLesson.videoPlaybackUrl"
                    :title="currentLesson.title"
                  />
                  <!-- YouTube embed if videoId is a short YouTube ID (not an R2 key) -->
                  <iframe
                    v-else-if="currentLesson.videoId && currentLesson.videoId.length < 20 && !currentLesson.videoId.includes('/')"
                    :src="`https://www.youtube.com/embed/${currentLesson.videoId}?rel=0&modestbranding=1`"
                    class="h-full w-full"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen
                  />
                  <!-- Direct video URL (dev/fallback) -->
                  <VideoPlayer
                    v-else-if="currentLesson.videoUrl"
                    :src="currentLesson.videoUrl"
                    :title="currentLesson.title"
                  />
                  <!-- Transcoding in progress -->
                  <div v-else-if="currentLesson.transcodingStatus === 'pending' || currentLesson.transcodingStatus === 'processing'" class="flex h-full items-center justify-center text-white">
                    <div class="text-center">
                      <Loader2 class="mx-auto h-12 w-12 animate-spin opacity-75" />
                      <p class="mt-4">{{ t('courses.lesson.videoProcessing', 'Video is being processed...') }}</p>
                      <p class="text-sm opacity-75">{{ t('courses.lesson.videoProcessingHint', 'Please check back in a few minutes') }}</p>
                    </div>
                  </div>
                  <!-- Placeholder if no video -->
                  <div v-else class="flex h-full items-center justify-center text-white">
                    <div class="text-center">
                      <PlayCircle class="mx-auto h-16 w-16 opacity-50" />
                      <p class="mt-4">{{ t('courses.lesson.videoComingSoon', 'Video coming soon') }}</p>
                      <p class="text-sm opacity-75">{{ currentLesson.title }}</p>
                    </div>
                  </div>
                </div>

                <!-- Mark complete button -->
                <div v-if="!isCompleted" class="flex items-center justify-end gap-3">
                  <span v-if="isPreviewMode" class="text-sm text-amber-600 dark:text-amber-400">
                    {{ t('common.preview.progressNotTracked', 'Progress not tracked in preview') }}
                  </span>
                  <Button :disabled="isMarking || isPreviewMode" @click="handleMarkComplete">
                    <Loader2 v-if="isMarking" class="mr-2 h-4 w-4 animate-spin" />
                    <CheckCircle2 v-else class="mr-2 h-4 w-4" />
                    {{ t('courses.lesson.markComplete') }}
                  </Button>
                </div>
                <div v-else class="flex items-center justify-end gap-2 text-green-600">
                  <CheckCircle2 class="h-5 w-5" />
                  <span class="font-medium">{{ t('courses.lesson.completed') }}</span>
                </div>
              </div>

              <!-- Quiz -->
              <div v-else-if="currentLesson.type === 'quiz'">
                <QuizEngine
                  :lesson-id="currentLesson.id"
                  :is-preview="isPreviewMode"
                  @complete="handleMarkComplete"
                />
              </div>

              <!-- Document/Assignment placeholder -->
              <div v-else class="rounded-lg border bg-muted/50 p-8 text-center">
                <component
                  :is="getLessonIcon(currentLesson.type)"
                  class="mx-auto h-12 w-12 text-muted-foreground"
                />
                <h3 class="mt-4 font-medium">{{ currentLesson.type === 'document' ? t('courses.lesson.types.document') : t('courses.lesson.types.assignment') }}</h3>
                <p class="mt-2 text-sm text-muted-foreground">
                  {{ t('courses.lesson.comingSoon') }}
                </p>
              </div>
            </div>

            <!-- Notes Tab -->
            <div v-show="activeTab === 'notes'">
              <NoteEditor :lesson-id="lessonId" :lesson-title="currentLesson?.title" />
            </div>

            <!-- Discussions Tab -->
            <div v-show="activeTab === 'discussions'">
              <DiscussionSection :lesson-id="lessonId" />
            </div>
          </div>
        </div>

        <!-- Sidebar - Lesson navigation -->
        <div class="hidden lg:block">
          <Card class="sticky top-20">
            <CardContent class="p-4">
              <h3 class="font-medium mb-4">{{ t('courses.lesson.sidebar.lessons') }}</h3>
              <div class="space-y-1 max-h-[60vh] overflow-y-auto">
                <button
                  v-for="lesson in allLessons"
                  :key="lesson.id"
                  class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors"
                  :class="{
                    'bg-primary/10 text-primary': lesson.id === lessonId,
                    'hover:bg-muted': lesson.id !== lessonId,
                  }"
                  @click="navigateToLesson(lesson)"
                >
                  <CheckCircle2
                    v-if="isLessonCompleted(lesson.id)"
                    class="h-4 w-4 shrink-0 text-green-500"
                  />
                  <component
                    :is="getLessonIcon(lesson.type)"
                    v-else
                    class="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                  <span class="truncate flex-1">{{ lesson.title }}</span>
                  <span class="shrink-0 text-xs text-muted-foreground">
                    {{ formatDuration(lesson.duration) }}
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <!-- Bottom navigation (mobile) -->
    <div
      v-if="course && currentLesson"
      class="fixed bottom-0 left-0 right-0 border-t bg-background p-4 lg:hidden"
    >
      <div class="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          class="flex-1"
          :disabled="!previousLesson"
          @click="previousLesson && navigateToLesson(previousLesson)"
        >
          <ArrowLeft class="mr-2 h-4 w-4" />
          {{ t('courses.lesson.nav.previous') }}
        </Button>
        <Button
          class="flex-1"
          :disabled="!nextLesson"
          @click="nextLesson && navigateToLesson(nextLesson)"
        >
          {{ t('courses.lesson.nav.next') }}
          <ArrowRight class="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>

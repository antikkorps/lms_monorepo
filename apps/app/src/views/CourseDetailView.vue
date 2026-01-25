<script setup lang="ts">
import { onMounted, watch, ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Clock,
  BookOpen,
  User,
  PlayCircle,
  HelpCircle,
  FileText,
  Edit3,
  CheckCircle2,
  Lock,
  ChevronDown,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-vue-next';
import { useCourseDetail } from '@/composables/useCourseDetail';
import { usePreview } from '@/composables/usePreview';
import { useToast } from '@/composables/useToast';
import { CourseDetailSkeleton } from '@/components/skeletons';
import { PreviewBanner } from '@/components/preview';
import type { LessonItem } from '@shared/types';

const { t } = useI18n();
const route = useRoute();
const toast = useToast();
const slug = route.params.slug as string;

// Preview mode
const { isPreviewMode, exitPreview } = usePreview();

const {
  isLoading,
  error,
  course,
  isEnrolled,
  isInPreviewMode,
  progress,
  isFree,
  totalLessons,
  completedLessonsCount,
  nextLesson,
  freeLessonsCount,
  fetchCourse,
  enroll,
  formatDuration,
  formatPrice,
  isLessonCompleted,
} = useCourseDetail(slug, { previewMode: isPreviewMode.value });

const isEnrolling = ref(false);
const expandedChapters = ref<Set<string>>(new Set());

onMounted(() => {
  fetchCourse();
});

// Re-fetch when slug changes
watch(
  () => route.params.slug,
  (newSlug) => {
    if (newSlug && newSlug !== slug) {
      window.location.reload();
    }
  }
);

function toggleChapter(chapterId: string) {
  if (expandedChapters.value.has(chapterId)) {
    expandedChapters.value.delete(chapterId);
  } else {
    expandedChapters.value.add(chapterId);
  }
}

function isChapterExpanded(chapterId: string): boolean {
  return expandedChapters.value.has(chapterId);
}

async function handleEnroll() {
  isEnrolling.value = true;
  const success = await enroll();
  isEnrolling.value = false;

  if (success) {
    toast.success(t('courses.detail.toast.enrollSuccess'));
  } else {
    toast.error(t('courses.detail.toast.enrollError'));
  }
}

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

function getProgressColor(pct: number): string {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-blue-500';
  if (pct >= 25) return 'bg-yellow-500';
  return 'bg-gray-400';
}
</script>

<template>
  <div>
    <!-- Preview Banner -->
    <PreviewBanner
      v-if="isPreviewMode"
      :course-title="course?.title"
      @exit="exitPreview"
    />

    <div class="space-y-6 container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Back button -->
      <RouterLink to="/courses" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft class="h-4 w-4" />
        {{ t('courses.detail.backToCourses') }}
      </RouterLink>

    <!-- Loading State -->
    <CourseDetailSkeleton v-if="isLoading" />

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">{{ error === 'Course not found' ? t('courses.detail.error.notFound') : t('courses.detail.error.loadFailed') }}</p>
          <p class="text-sm text-muted-foreground">
            {{ error === 'Course not found' ? t('courses.detail.error.notFoundMessage') : error }}
          </p>
        </div>
        <RouterLink to="/courses" class="ml-auto">
          <Button variant="outline">{{ t('courses.catalog.title') }}</Button>
        </RouterLink>
      </CardContent>
    </Card>

    <!-- Course Content -->
    <template v-else-if="course">
      <!-- Course Header -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Main Info -->
        <div class="lg:col-span-2 space-y-4">
          <div>
            <h1 class="text-3xl font-bold tracking-tight">{{ course.title }}</h1>
            <div class="mt-2 flex items-center gap-2 text-muted-foreground">
              <User class="h-4 w-4" />
              <span>{{ course.instructorName }}</span>
            </div>
          </div>

          <p class="text-muted-foreground leading-relaxed">{{ course.description }}</p>

          <!-- Meta badges -->
          <div class="flex flex-wrap gap-3">
            <div class="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm">
              <Clock class="h-4 w-4" />
              <span>{{ formatDuration(course.duration) }}</span>
            </div>
            <div class="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm">
              <BookOpen class="h-4 w-4" />
              <span>{{ t('courses.detail.chapters', { count: course.chaptersCount }) }}</span>
            </div>
            <div class="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm">
              <PlayCircle class="h-4 w-4" />
              <span>{{ t('courses.detail.lessons', { count: totalLessons }) }}</span>
            </div>
            <div v-if="freeLessonsCount > 0" class="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
              <span>{{ t('courses.detail.freeLessons', { count: freeLessonsCount }) }}</span>
            </div>
          </div>
        </div>

        <!-- Enrollment Card -->
        <div>
          <Card class="sticky top-20">
            <CardContent class="p-6 space-y-4">
              <!-- Preview Mode Card -->
              <template v-if="isPreviewMode">
                <div class="flex flex-col items-center gap-3 py-4">
                  <div class="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 dark:bg-amber-900/50">
                    <Eye class="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span class="font-medium text-amber-700 dark:text-amber-300">
                      {{ t('common.preview.mode', 'Preview Mode') }}
                    </span>
                  </div>
                  <p class="text-center text-sm text-muted-foreground">
                    {{ t('common.preview.coursePreviewDescription', 'You are viewing this course as a learner would see it.') }}
                  </p>
                </div>

                <!-- Start from first lesson in preview -->
                <RouterLink v-if="course.chapters.length > 0 && course.chapters[0].lessons.length > 0" :to="`/courses/${course.slug}/learn/${course.chapters[0].lessons[0].id}?preview=true`">
                  <Button class="w-full" size="lg">
                    <PlayCircle class="mr-2 h-5 w-5" />
                    {{ t('common.preview.startPreview', 'Start Preview') }}
                  </Button>
                </RouterLink>
              </template>

              <!-- Normal enrollment flow -->
              <template v-else>
                <!-- Price -->
                <div class="text-center">
                  <span class="text-3xl font-bold">{{ formatPrice(course.price) }}</span>
                </div>

                <!-- Progress (if enrolled) -->
                <div v-if="isEnrolled" class="space-y-2">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">{{ t('courses.detail.progress') }}</span>
                    <span class="font-medium">{{ progress }}%</span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      :class="getProgressColor(progress)"
                      class="h-full transition-all"
                      :style="{ width: `${progress}%` }"
                    />
                  </div>
                  <p class="text-xs text-muted-foreground text-center">
                    {{ t('courses.detail.lessonsCompleted', { completed: completedLessonsCount, total: totalLessons }) }}
                  </p>
                </div>

                <!-- CTA Button -->
                <div v-if="isEnrolled">
                  <RouterLink v-if="nextLesson" :to="`/courses/${course.slug}/learn/${nextLesson.id}`">
                    <Button class="w-full" size="lg">
                      <PlayCircle class="mr-2 h-5 w-5" />
                      {{ completedLessonsCount > 0 ? t('courses.enrollment.continueLearning') : t('courses.enrollment.startLearning') }}
                    </Button>
                  </RouterLink>
                  <Button v-else class="w-full" size="lg" disabled>
                    <CheckCircle2 class="mr-2 h-5 w-5" />
                    {{ t('courses.detail.courseCompleted') }}
                  </Button>
                </div>
                <div v-else>
                  <Button class="w-full" size="lg" :disabled="isEnrolling" @click="handleEnroll">
                    <Loader2 v-if="isEnrolling" class="mr-2 h-5 w-5 animate-spin" />
                    <template v-else>
                      {{ isFree ? t('courses.enrollment.enrollFree') : t('courses.enrollment.enroll') }}
                    </template>
                  </Button>
                </div>

                <!-- Features -->
                <ul class="space-y-2 text-sm text-muted-foreground">
                  <li class="flex items-center gap-2">
                    <CheckCircle2 class="h-4 w-4 text-green-500" />
                    {{ t('courses.detail.lifetime') }}
                  </li>
                  <li class="flex items-center gap-2">
                    <CheckCircle2 class="h-4 w-4 text-green-500" />
                    {{ t('courses.detail.certificate') }}
                  </li>
                  <li class="flex items-center gap-2">
                    <CheckCircle2 class="h-4 w-4 text-green-500" />
                    {{ t('courses.detail.mobile') }}
                  </li>
                </ul>
              </template>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Course Curriculum -->
      <Card>
        <CardHeader>
          <CardTitle>{{ t('courses.detail.curriculum') }}</CardTitle>
        </CardHeader>
        <CardContent class="p-0">
          <div class="divide-y">
            <div v-for="chapter in course.chapters" :key="chapter.id" class="border-b last:border-b-0">
              <!-- Chapter Header -->
              <button
                class="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                @click="toggleChapter(chapter.id)"
              >
                <div class="flex items-center gap-3">
                  <ChevronDown
                    class="h-5 w-5 text-muted-foreground transition-transform"
                    :class="{ '-rotate-90': !isChapterExpanded(chapter.id) }"
                  />
                  <div>
                    <h3 class="font-medium">{{ chapter.title }}</h3>
                    <p class="text-sm text-muted-foreground">
                      {{ t('courses.detail.lessons', { count: chapter.lessons.length }) }}
                    </p>
                  </div>
                </div>
              </button>

              <!-- Lessons List -->
              <div v-show="isChapterExpanded(chapter.id)" class="bg-muted/30">
                <div
                  v-for="lesson in chapter.lessons"
                  :key="lesson.id"
                  class="flex items-center gap-3 border-t px-4 py-3 pl-12"
                >
                  <!-- Completion/Lock Status -->
                  <div class="shrink-0">
                    <CheckCircle2
                      v-if="isLessonCompleted(lesson.id)"
                      class="h-5 w-5 text-green-500"
                    />
                    <Lock
                      v-else-if="!lesson.isAccessible"
                      class="h-5 w-5 text-muted-foreground"
                    />
                    <component
                      :is="getLessonIcon(lesson.type)"
                      v-else
                      class="h-5 w-5 text-muted-foreground"
                    />
                  </div>

                  <!-- Lesson Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="truncate" :class="{ 'text-muted-foreground': !lesson.isAccessible }">
                        {{ lesson.title }}
                      </span>
                      <span
                        v-if="lesson.isFree"
                        class="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700"
                      >
                        {{ t('courses.card.free') }}
                      </span>
                    </div>
                  </div>

                  <!-- Duration -->
                  <span class="shrink-0 text-sm text-muted-foreground">
                    {{ formatDuration(lesson.duration) }}
                  </span>

                  <!-- Play button (if accessible) -->
                  <RouterLink
                    v-if="lesson.isAccessible && isEnrolled"
                    :to="isPreviewMode ? `/courses/${course.slug}/learn/${lesson.id}?preview=true` : `/courses/${course.slug}/learn/${lesson.id}`"
                    class="shrink-0"
                  >
                    <Button size="sm" variant="ghost" class="h-8 w-8 p-0">
                      <PlayCircle class="h-4 w-4" />
                    </Button>
                  </RouterLink>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>
    </div>
  </div>
</template>

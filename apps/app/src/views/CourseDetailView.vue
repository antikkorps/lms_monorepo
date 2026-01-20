<script setup lang="ts">
import { onMounted, watch, ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
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
} from 'lucide-vue-next';
import { useCourseDetail } from '@/composables/useCourseDetail';
import { useToast } from '@/composables/useToast';
import { CourseDetailSkeleton } from '@/components/skeletons';
import type { LessonItem } from '@shared/types';

const route = useRoute();
const toast = useToast();
const slug = route.params.slug as string;

const {
  isLoading,
  error,
  course,
  isEnrolled,
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
} = useCourseDetail(slug);

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
    toast.success('Successfully enrolled in course!');
  } else {
    toast.error('Failed to enroll. Please try again.');
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
  <div class="space-y-6">
    <!-- Back button -->
    <RouterLink to="/courses" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft class="h-4 w-4" />
      Back to Courses
    </RouterLink>

    <!-- Loading State -->
    <CourseDetailSkeleton v-if="isLoading" />

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">{{ error === 'Course not found' ? 'Course Not Found' : 'Failed to load course' }}</p>
          <p class="text-sm text-muted-foreground">
            {{ error === 'Course not found' ? 'The course you are looking for does not exist.' : error }}
          </p>
        </div>
        <RouterLink to="/courses" class="ml-auto">
          <Button variant="outline">Browse Courses</Button>
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
              <span>{{ course.chaptersCount }} chapters</span>
            </div>
            <div class="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm">
              <PlayCircle class="h-4 w-4" />
              <span>{{ totalLessons }} lessons</span>
            </div>
            <div v-if="freeLessonsCount > 0" class="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
              <span>{{ freeLessonsCount }} free lessons</span>
            </div>
          </div>
        </div>

        <!-- Enrollment Card -->
        <div>
          <Card class="sticky top-20">
            <CardContent class="p-6 space-y-4">
              <!-- Price -->
              <div class="text-center">
                <span class="text-3xl font-bold">{{ formatPrice(course.price) }}</span>
              </div>

              <!-- Progress (if enrolled) -->
              <div v-if="isEnrolled" class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-muted-foreground">Progress</span>
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
                  {{ completedLessonsCount }} of {{ totalLessons }} lessons completed
                </p>
              </div>

              <!-- CTA Button -->
              <div v-if="isEnrolled">
                <RouterLink v-if="nextLesson" :to="`/courses/${course.slug}/learn/${nextLesson.id}`">
                  <Button class="w-full" size="lg">
                    <PlayCircle class="mr-2 h-5 w-5" />
                    {{ completedLessonsCount > 0 ? 'Continue Learning' : 'Start Course' }}
                  </Button>
                </RouterLink>
                <Button v-else class="w-full" size="lg" disabled>
                  <CheckCircle2 class="mr-2 h-5 w-5" />
                  Course Completed
                </Button>
              </div>
              <div v-else>
                <Button class="w-full" size="lg" :disabled="isEnrolling" @click="handleEnroll">
                  <Loader2 v-if="isEnrolling" class="mr-2 h-5 w-5 animate-spin" />
                  <template v-else>
                    {{ isFree ? 'Enroll for Free' : 'Enroll Now' }}
                  </template>
                </Button>
              </div>

              <!-- Features -->
              <ul class="space-y-2 text-sm text-muted-foreground">
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="h-4 w-4 text-green-500" />
                  Full lifetime access
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="h-4 w-4 text-green-500" />
                  Certificate of completion
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="h-4 w-4 text-green-500" />
                  Access on mobile and desktop
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Course Curriculum -->
      <Card>
        <CardHeader>
          <CardTitle>Course Curriculum</CardTitle>
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
                      {{ chapter.lessons.length }} lessons
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
                        Free
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
                    :to="`/courses/${course.slug}/learn/${lesson.id}`"
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
</template>

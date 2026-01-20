<script setup lang="ts">
import type { CourseProgress } from '@/composables/useProgress';
import { RouterLink } from 'vue-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, CheckCircle2, Clock, BookOpen } from 'lucide-vue-next';

interface Props {
  course: CourseProgress;
}

const props = defineProps<Props>();

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function getProgressColor(progress: number): string {
  if (progress === 100) return 'bg-green-500';
  if (progress >= 75) return 'bg-green-500';
  if (progress >= 50) return 'bg-blue-500';
  if (progress >= 25) return 'bg-yellow-500';
  return 'bg-gray-400';
}

const isCompleted = props.course.progress === 100;
</script>

<template>
  <Card class="group overflow-hidden transition-shadow hover:shadow-md">
    <CardContent class="p-0">
      <div class="flex flex-col sm:flex-row">
        <!-- Thumbnail -->
        <div class="relative aspect-video w-full shrink-0 sm:aspect-square sm:w-40">
          <div
            class="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5"
          >
            <BookOpen class="h-10 w-10 text-primary/40" />
          </div>

          <!-- Progress overlay -->
          <div
            class="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-2 py-1 text-xs text-white"
          >
            <span>{{ course.progress }}%</span>
            <span>{{ course.completedLessons }}/{{ course.totalLessons }}</span>
          </div>

          <!-- Completed badge -->
          <div
            v-if="isCompleted"
            class="absolute right-2 top-2 rounded-full bg-green-500 p-1"
          >
            <CheckCircle2 class="h-4 w-4 text-white" />
          </div>
        </div>

        <!-- Content -->
        <div class="flex flex-1 flex-col p-4">
          <div class="flex-1">
            <!-- Title -->
            <RouterLink
              :to="`/courses/${course.slug}`"
              class="line-clamp-1 font-semibold hover:text-primary"
            >
              {{ course.title }}
            </RouterLink>

            <!-- Instructor -->
            <p class="text-sm text-muted-foreground">{{ course.instructorName }}</p>

            <!-- Progress bar -->
            <div class="mt-3">
              <div class="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  :class="getProgressColor(course.progress)"
                  class="h-full transition-all"
                  :style="{ width: `${course.progress}%` }"
                />
              </div>
            </div>

            <!-- Meta -->
            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span class="flex items-center gap-1">
                <Clock class="h-3 w-3" />
                {{ formatRelativeTime(course.lastAccessedAt) }}
              </span>
              <span v-if="!isCompleted && course.estimatedTimeLeft > 0">
                ~{{ formatDuration(course.estimatedTimeLeft) }} left
              </span>
              <span v-if="isCompleted" class="text-green-600">
                Completed {{ formatRelativeTime(course.completedAt!) }}
              </span>
            </div>

            <!-- Next lesson -->
            <p v-if="course.nextLessonTitle" class="mt-2 text-sm text-muted-foreground">
              Next: <span class="text-foreground">{{ course.nextLessonTitle }}</span>
            </p>
          </div>

          <!-- Action -->
          <div class="mt-4">
            <RouterLink :to="`/courses/${course.slug}`">
              <Button
                :variant="isCompleted ? 'outline' : 'default'"
                size="sm"
                class="w-full sm:w-auto"
              >
                <PlayCircle v-if="!isCompleted" class="mr-2 h-4 w-4" />
                <CheckCircle2 v-else class="mr-2 h-4 w-4" />
                {{ isCompleted ? 'Review Course' : 'Continue' }}
              </Button>
            </RouterLink>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

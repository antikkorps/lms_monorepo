<script setup lang="ts">
import type { CourseListItem } from '@shared/types';
import { RouterLink } from 'vue-router';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, BookOpen, User } from 'lucide-vue-next';

interface Props {
  course: CourseListItem;
  showProgress?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showProgress: false,
});

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(price / 100);
}

function getProgressColor(progress: number): string {
  if (progress >= 75) return 'bg-green-500';
  if (progress >= 50) return 'bg-blue-500';
  if (progress >= 25) return 'bg-yellow-500';
  return 'bg-gray-400';
}
</script>

<template>
  <Card class="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
    <!-- Thumbnail -->
    <div class="relative aspect-video overflow-hidden bg-muted">
      <img
        v-if="course.thumbnailUrl"
        :src="course.thumbnailUrl"
        :alt="course.title"
        class="h-full w-full object-cover transition-transform group-hover:scale-105"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5"
      >
        <BookOpen class="h-12 w-12 text-primary/40" />
      </div>

      <!-- Price badge -->
      <div
        class="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-1 text-sm font-semibold backdrop-blur-sm"
      >
        {{ formatPrice(course.price) }}
      </div>
    </div>

    <CardContent class="flex-1 p-4">
      <!-- Title -->
      <h3 class="line-clamp-2 font-semibold leading-tight group-hover:text-primary">
        {{ course.title }}
      </h3>

      <!-- Instructor -->
      <div class="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
        <User class="h-3 w-3" />
        <span>{{ course.instructorName }}</span>
      </div>

      <!-- Description -->
      <p v-if="course.description" class="mt-2 line-clamp-2 text-sm text-muted-foreground">
        {{ course.description }}
      </p>

      <!-- Progress bar (if enrolled) -->
      <div v-if="showProgress && course.progress !== undefined" class="mt-3">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground">Progress</span>
          <span class="font-medium">{{ course.progress }}%</span>
        </div>
        <div class="mt-1 h-2 overflow-hidden rounded-full bg-muted">
          <div
            :class="getProgressColor(course.progress)"
            class="h-full transition-all"
            :style="{ width: `${course.progress}%` }"
          />
        </div>
      </div>
    </CardContent>

    <CardFooter class="flex items-center justify-between border-t p-4 pt-3">
      <!-- Meta info -->
      <div class="flex items-center gap-3 text-xs text-muted-foreground">
        <div class="flex items-center gap-1">
          <Clock class="h-3 w-3" />
          <span>{{ formatDuration(course.duration) }}</span>
        </div>
        <div class="flex items-center gap-1">
          <BookOpen class="h-3 w-3" />
          <span>{{ course.lessonsCount }} lessons</span>
        </div>
      </div>

      <!-- Action -->
      <RouterLink :to="`/courses/${course.slug}`">
        <Button size="sm" variant="ghost" class="h-8 px-2">
          {{ course.progress !== undefined ? 'Continue' : 'View' }}
        </Button>
      </RouterLink>
    </CardFooter>
  </Card>
</template>

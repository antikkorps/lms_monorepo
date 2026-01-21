<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton';
import CourseCardSkeleton from './CourseCardSkeleton.vue';

interface Props {
  count?: number;
}

withDefaults(defineProps<Props>(), {
  count: 6,
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header skeleton -->
    <div>
      <Skeleton class="h-9 w-48" />
      <Skeleton class="mt-2 h-5 w-72" />
    </div>

    <!-- Search and filters skeleton -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Skeleton class="h-10 w-full sm:max-w-sm" />
      <div class="flex items-center gap-2">
        <Skeleton class="h-10 w-64" />
        <Skeleton class="hidden h-10 w-32 lg:block" />
      </div>
    </div>

    <!-- Course grid skeleton -->
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <CourseCardSkeleton v-for="i in count" :key="i" />
    </div>
  </div>
</template>

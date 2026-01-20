<script setup lang="ts">
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
</script>

<template>
  <Card class="flex h-full flex-col overflow-hidden">
    <!-- Thumbnail -->
    <Skeleton class="aspect-video w-full" variant="default" />

    <CardContent class="flex-1 p-4">
      <!-- Title -->
      <Skeleton class="h-5 w-full" />
      <Skeleton class="mt-1 h-5 w-3/4" />

      <!-- Instructor -->
      <div class="mt-2 flex items-center gap-1">
        <Skeleton class="h-3 w-3" variant="circular" />
        <Skeleton class="h-3 w-24" />
      </div>

      <!-- Description -->
      <Skeleton class="mt-2 h-4 w-full" />
      <Skeleton class="mt-1 h-4 w-5/6" />
    </CardContent>

    <CardFooter class="flex items-center justify-between border-t p-4 pt-3">
      <div class="flex items-center gap-3">
        <Skeleton class="h-3 w-12" />
        <Skeleton class="h-3 w-16" />
      </div>
      <Skeleton class="h-8 w-14" />
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
</script>

<template>
  <div class="space-y-6">
    <!-- Back button -->
    <Skeleton class="h-5 w-32" />

    <!-- Course Header -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Main Info -->
      <div class="lg:col-span-2 space-y-4">
        <div>
          <Skeleton class="h-9 w-full max-w-lg" />
          <div class="mt-2 flex items-center gap-2">
            <Skeleton class="h-4 w-4" variant="circular" />
            <Skeleton class="h-4 w-32" />
          </div>
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-3/4" />
        </div>

        <!-- Meta badges -->
        <div class="flex flex-wrap gap-3">
          <Skeleton class="h-7 w-20" variant="rounded" />
          <Skeleton class="h-7 w-28" variant="rounded" />
          <Skeleton class="h-7 w-24" variant="rounded" />
          <Skeleton class="h-7 w-28" variant="rounded" />
        </div>
      </div>

      <!-- Enrollment Card -->
      <div>
        <Card>
          <CardContent class="p-6 space-y-4">
            <!-- Price -->
            <div class="text-center">
              <Skeleton class="mx-auto h-10 w-24" />
            </div>

            <!-- Progress -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <Skeleton class="h-4 w-16" />
                <Skeleton class="h-4 w-10" />
              </div>
              <Skeleton class="h-2 w-full" />
              <Skeleton class="mx-auto h-3 w-40" />
            </div>

            <!-- CTA Button -->
            <Skeleton class="h-12 w-full" />

            <!-- Features -->
            <div class="space-y-2">
              <div v-for="i in 3" :key="i" class="flex items-center gap-2">
                <Skeleton class="h-4 w-4" variant="circular" />
                <Skeleton class="h-4 w-36" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Course Curriculum -->
    <Card>
      <CardHeader>
        <Skeleton class="h-6 w-40" />
      </CardHeader>
      <CardContent class="p-0">
        <div class="divide-y">
          <div v-for="i in 4" :key="i" class="p-4">
            <!-- Chapter Header -->
            <div class="flex items-center gap-3">
              <Skeleton class="h-5 w-5" />
              <div class="flex-1">
                <Skeleton class="h-5 w-48" />
                <Skeleton class="mt-1 h-4 w-20" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

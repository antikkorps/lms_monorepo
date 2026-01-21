<script setup lang="ts">
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
</script>

<template>
  <div class="space-y-6">
    <!-- Header skeleton -->
    <div class="flex items-center justify-between">
      <div>
        <Skeleton class="h-9 w-48" />
        <Skeleton class="mt-2 h-5 w-72" />
      </div>
      <Skeleton class="h-10 w-32" />
    </div>

    <!-- Filters skeleton -->
    <Card>
      <CardContent class="pt-6">
        <div class="flex flex-wrap items-center gap-4">
          <Skeleton class="h-10 w-64" />
          <Skeleton class="h-10 w-40" />
          <Skeleton class="h-10 w-40" />
        </div>
      </CardContent>
    </Card>

    <!-- Table skeleton -->
    <Card>
      <CardContent class="p-0">
        <!-- Table header -->
        <div class="flex items-center gap-4 border-b px-6 py-3">
          <Skeleton class="h-4 w-40" />
          <Skeleton class="h-4 w-48" />
          <Skeleton class="h-4 w-20" />
          <Skeleton class="h-4 w-20" />
          <Skeleton class="h-4 w-24" />
          <Skeleton class="ml-auto h-4 w-16" />
        </div>

        <!-- Table rows -->
        <div v-for="i in 10" :key="i" class="flex items-center gap-4 border-b px-6 py-4 last:border-0">
          <div class="flex items-center gap-3">
            <Skeleton class="h-10 w-10 shrink-0" variant="circular" />
            <Skeleton class="h-5 w-32" />
          </div>
          <Skeleton class="h-4 w-48" />
          <Skeleton class="h-6 w-20" />
          <Skeleton class="h-6 w-16" />
          <Skeleton class="h-4 w-24" />
          <Skeleton class="ml-auto h-8 w-8" variant="rounded" />
        </div>
      </CardContent>
    </Card>

    <!-- Pagination skeleton -->
    <div class="flex items-center justify-between">
      <Skeleton class="h-4 w-40" />
      <div class="flex items-center gap-2">
        <Skeleton class="h-10 w-10" />
        <Skeleton class="h-10 w-10" />
        <Skeleton class="h-10 w-10" />
        <Skeleton class="h-10 w-10" />
      </div>
    </div>
  </div>
</template>

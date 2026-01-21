<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
</script>

<template>
  <div class="space-y-6">
    <!-- Header skeleton -->
    <div class="flex items-center justify-between">
      <div>
        <Skeleton class="h-9 w-40" />
        <Skeleton class="mt-2 h-5 w-64" />
      </div>
      <Skeleton class="h-10 w-36" />
    </div>

    <!-- Stats cards skeleton -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card v-for="i in 4" :key="i">
        <CardContent class="pt-6">
          <Skeleton class="h-4 w-20 mb-2" />
          <Skeleton class="h-8 w-12" />
        </CardContent>
      </Card>
    </div>

    <!-- Filters skeleton -->
    <div class="flex items-center gap-4">
      <Skeleton class="h-10 w-40" />
    </div>

    <!-- Table skeleton -->
    <Card>
      <CardContent class="p-0">
        <!-- Table header -->
        <div class="flex items-center gap-4 border-b px-6 py-3">
          <Skeleton class="h-4 w-48" />
          <Skeleton class="h-4 w-20" />
          <Skeleton class="h-4 w-20" />
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-4 w-24" />
          <Skeleton class="ml-auto h-4 w-16" />
        </div>

        <!-- Table rows -->
        <div v-for="i in 5" :key="i" class="flex items-center gap-4 border-b px-6 py-4 last:border-0">
          <div class="flex-1">
            <Skeleton class="h-5 w-48" />
            <Skeleton class="mt-1 h-4 w-32" />
          </div>
          <Skeleton class="h-6 w-20" />
          <Skeleton class="h-6 w-16" />
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-4 w-20" />
          <Skeleton class="ml-auto h-8 w-8" variant="rounded" />
        </div>
      </CardContent>
    </Card>
  </div>
</template>

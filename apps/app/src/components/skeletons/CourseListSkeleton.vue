<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
</script>

<template>
  <div class="space-y-6">
    <!-- Filters skeleton -->
    <Card>
      <CardContent class="pt-6">
        <div class="flex flex-wrap items-center gap-4">
          <Skeleton class="h-10 w-64" />
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
          <Skeleton class="h-4 w-20" />
          <Skeleton class="h-4 w-32" />
          <Skeleton class="h-4 w-20" />
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-4 w-24" />
          <Skeleton class="ml-auto h-4 w-16" />
        </div>

        <!-- Table rows -->
        <div v-for="i in 6" :key="i" class="flex items-center gap-4 border-b px-6 py-4 last:border-0">
          <div class="flex items-center gap-3">
            <Skeleton class="h-10 w-16 shrink-0" />
            <div>
              <Skeleton class="h-5 w-48" />
              <Skeleton class="mt-1 h-3 w-32" />
            </div>
          </div>
          <Skeleton class="h-6 w-20" />
          <Skeleton class="h-4 w-36" />
          <Skeleton class="h-4 w-16" />
          <Skeleton class="h-4 w-12" />
          <Skeleton class="h-4 w-24" />
          <Skeleton class="ml-auto h-8 w-8" variant="rounded" />
        </div>
      </CardContent>
    </Card>
  </div>
</template>

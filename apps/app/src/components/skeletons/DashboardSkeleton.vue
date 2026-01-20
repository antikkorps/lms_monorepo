<script setup lang="ts">
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
</script>

<template>
  <div class="space-y-6">
    <!-- Header skeleton -->
    <div>
      <Skeleton class="h-9 w-64" />
      <Skeleton class="mt-2 h-5 w-96" />
    </div>

    <!-- Stats cards skeleton -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card v-for="i in 4" :key="i">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-4 w-4" variant="rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-8 w-16" />
          <Skeleton class="mt-1 h-3 w-20" />
        </CardContent>
      </Card>
    </div>

    <!-- Continue Learning skeleton -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <Skeleton class="h-6 w-40" />
            <Skeleton class="mt-1 h-4 w-48" />
          </div>
          <Skeleton class="h-8 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <div
            v-for="i in 3"
            :key="i"
            class="flex items-center gap-4 rounded-lg border p-4"
          >
            <Skeleton class="h-16 w-24 shrink-0" variant="rounded" />
            <div class="min-w-0 flex-1 space-y-2">
              <Skeleton class="h-5 w-3/4" />
              <Skeleton class="h-4 w-32" />
              <Skeleton class="h-2 w-full" />
            </div>
            <Skeleton class="h-9 w-20 shrink-0" />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Badges skeleton -->
    <Card>
      <CardHeader>
        <Skeleton class="h-6 w-44" />
        <Skeleton class="mt-1 h-4 w-56" />
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-4">
          <div
            v-for="i in 3"
            :key="i"
            class="flex items-center gap-3 rounded-lg border p-3"
          >
            <Skeleton class="h-12 w-12" variant="circular" />
            <div>
              <Skeleton class="h-4 w-24" />
              <Skeleton class="mt-1 h-3 w-32" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

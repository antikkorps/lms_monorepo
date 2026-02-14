<script setup lang="ts">
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
</script>

<template>
  <div class="space-y-6">
    <!-- Header skeleton -->
    <div class="flex items-center gap-4">
      <Skeleton class="h-8 w-8" variant="rounded" />
      <div>
        <Skeleton class="h-7 w-64" />
        <Skeleton class="mt-1 h-4 w-40" />
      </div>
    </div>

    <!-- KPI cards skeleton -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card v-for="i in 4" :key="i">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-4 w-4" variant="rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-8 w-20" />
          <Skeleton class="mt-2 h-4 w-32" />
        </CardContent>
      </Card>
    </div>

    <!-- Charts skeleton -->
    <div class="grid gap-6 lg:grid-cols-2">
      <Card v-for="i in 4" :key="i">
        <CardHeader>
          <Skeleton class="h-5 w-40" />
          <Skeleton class="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-48 w-full" />
        </CardContent>
      </Card>
    </div>

    <!-- Table skeleton -->
    <Card>
      <CardHeader>
        <Skeleton class="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div class="space-y-3">
          <Skeleton v-for="i in 5" :key="i" class="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  </div>
</template>

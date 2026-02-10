<script setup lang="ts">
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
</script>

<template>
  <div class="space-y-6">
    <!-- Stats cards skeleton -->
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

    <!-- Charts grid skeleton -->
    <div class="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <Skeleton class="h-6 w-40" />
          <Skeleton class="mt-1 h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-64 w-full" variant="rounded" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton class="h-6 w-40" />
          <Skeleton class="mt-1 h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-64 w-full" variant="rounded" />
        </CardContent>
      </Card>
    </div>

    <!-- Secondary sections skeleton -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Top courses table -->
      <Card>
        <CardHeader>
          <Skeleton class="h-6 w-40" />
          <Skeleton class="mt-1 h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div class="space-y-3">
            <div v-for="i in 5" :key="i" class="flex items-center justify-between">
              <Skeleton class="h-5 w-48" />
              <Skeleton class="h-5 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Category distribution -->
      <Card>
        <CardHeader>
          <Skeleton class="h-6 w-40" />
          <Skeleton class="mt-1 h-4 w-48" />
        </CardHeader>
        <CardContent class="flex items-center justify-center">
          <Skeleton class="h-52 w-52" variant="circular" />
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <Skeleton class="h-9 w-48 mb-2" />
        <Skeleton class="h-5 w-80" />
      </div>
      <Skeleton class="h-10 w-32" />
    </div>

    <!-- Overview Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card v-for="i in 4" :key="i">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-8 w-16 mb-2" />
          <Skeleton class="h-3 w-32" />
        </CardContent>
      </Card>
    </div>

    <!-- Usage Bar -->
    <Card>
      <CardHeader>
        <Skeleton class="h-6 w-32" />
        <Skeleton class="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <Skeleton class="h-4 w-full" />
          <div class="flex justify-between">
            <Skeleton class="h-4 w-24" />
            <Skeleton class="h-4 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Charts Grid -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Allocation Chart -->
      <Card>
        <CardHeader>
          <Skeleton class="h-6 w-40" />
          <Skeleton class="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-64 w-full" />
        </CardContent>
      </Card>

      <!-- Usage History Chart -->
      <Card>
        <CardHeader>
          <Skeleton class="h-6 w-32" />
          <Skeleton class="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-64 w-full" />
        </CardContent>
      </Card>
    </div>

    <!-- Plans Section -->
    <Card>
      <CardHeader>
        <Skeleton class="h-6 w-48" />
        <Skeleton class="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 md:grid-cols-3">
          <Card v-for="i in 3" :key="i" class="p-4">
            <Skeleton class="h-6 w-24 mb-4" />
            <Skeleton class="h-8 w-32 mb-2" />
            <Skeleton class="h-4 w-20 mb-4" />
            <div class="space-y-2">
              <Skeleton v-for="j in 4" :key="j" class="h-4 w-full" />
            </div>
            <Skeleton class="h-10 w-full mt-4" />
          </Card>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

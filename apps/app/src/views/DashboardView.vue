<script setup lang="ts">
// Dashboard view - placeholder for future implementation
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <h1 class="text-xl font-semibold">Dashboard</h1>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Stats cards -->
        <div class="card">
          <h3 class="text-sm font-medium text-gray-500 mb-1">My Courses</h3>
          <p class="text-3xl font-bold">0</p>
        </div>

        <div class="card">
          <h3 class="text-sm font-medium text-gray-500 mb-1">Completed</h3>
          <p class="text-3xl font-bold">0</p>
        </div>

        <div class="card">
          <h3 class="text-sm font-medium text-gray-500 mb-1">Badges</h3>
          <p class="text-3xl font-bold">0</p>
        </div>
      </div>

      <div class="mt-8">
        <h2 class="text-lg font-semibold mb-4">Continue Learning</h2>
        <div class="card">
          <p class="text-gray-500 text-center py-8">
            No courses yet. Start exploring our catalog!
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

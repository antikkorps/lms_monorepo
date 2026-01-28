<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <!-- Header with logo -->
    <header class="py-6">
      <div class="container mx-auto px-4">
        <RouterLink to="/" class="text-2xl font-bold text-foreground">
          LMS Platform
        </RouterLink>
      </div>
    </header>

    <!-- Main content - centered card -->
    <main class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-lg">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="py-6 text-center text-sm text-muted-foreground">
      <p>&copy; {{ new Date().getFullYear() }} LMS Platform. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { APP_NAME } from '@shared/config';

const landingUrl = import.meta.env.VITE_LANDING_URL || '/';
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <!-- Header with logo -->
    <header class="py-6">
      <div class="container mx-auto px-4">
        <a :href="landingUrl" class="text-2xl font-bold text-foreground">
          {{ APP_NAME }}
        </a>
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
      <p>&copy; {{ new Date().getFullYear() }} {{ APP_NAME }}. All rights reserved.</p>
    </footer>
  </div>
</template>

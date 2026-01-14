<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-8">
    <div class="text-center max-w-2xl">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">
        LMS Platform
      </h1>
      <p class="text-lg text-gray-600 mb-8">
        Modern Learning Management System with AI-powered features
      </p>
      <div class="flex gap-4 justify-center">
        <RouterLink to="/login" class="btn-primary">
          Get Started
        </RouterLink>
        <RouterLink to="/dashboard" class="btn-secondary">
          Dashboard
        </RouterLink>
      </div>
    </div>
  </div>
</template>

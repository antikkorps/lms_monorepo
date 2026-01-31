<script setup lang="ts">
import { NotificationList } from '@/components/notifications';
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Notifications</h1>
      <p class="text-muted-foreground">Stay updated with your learning activity</p>
    </div>

    <!-- Notification List -->
    <NotificationList />
  </div>
</template>

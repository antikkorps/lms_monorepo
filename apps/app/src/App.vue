<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { Toaster } from '@/components/ui/sonner';
import { AppLayout, AuthLayout } from '@/layouts';

const route = useRoute();

const layout = computed(() => {
  const layoutName = route.meta.layout as string | undefined;
  switch (layoutName) {
    case 'auth':
      return AuthLayout;
    case 'app':
      return AppLayout;
    default:
      return null;
  }
});
</script>

<template>
  <component :is="layout" v-if="layout">
    <RouterView />
  </component>
  <RouterView v-else />
  <Toaster position="top-right" :duration="4000" rich-colors />
</template>

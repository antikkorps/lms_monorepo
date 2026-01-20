<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  class?: string;
  variant?: 'default' | 'circular' | 'rounded';
  width?: string;
  height?: string;
  animation?: 'pulse' | 'shimmer' | 'none';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  animation: 'pulse',
});

const classes = computed(() => {
  const base = 'bg-muted';

  const variants = {
    default: 'rounded-md',
    circular: 'rounded-full',
    rounded: 'rounded-lg',
  };

  const animations = {
    pulse: 'animate-pulse',
    shimmer: 'skeleton-shimmer',
    none: '',
  };

  return [base, variants[props.variant], animations[props.animation], props.class].filter(Boolean).join(' ');
});

const styles = computed(() => ({
  width: props.width,
  height: props.height,
}));
</script>

<template>
  <div :class="classes" :style="styles" />
</template>

<style scoped>
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 0%,
    hsl(var(--muted-foreground) / 0.1) 50%,
    hsl(var(--muted)) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>

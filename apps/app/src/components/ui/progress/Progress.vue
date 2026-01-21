<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/utils';

interface Props {
  value: number;
  max?: number;
  class?: string;
  indicatorClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  max: 100,
});

const percentage = computed(() => {
  return Math.min(Math.max((props.value / props.max) * 100, 0), 100);
});
</script>

<template>
  <div
    :class="cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', props.class)"
    role="progressbar"
    :aria-valuenow="value"
    :aria-valuemin="0"
    :aria-valuemax="max"
  >
    <div
      :class="cn('h-full bg-primary transition-all', indicatorClass)"
      :style="{ width: `${percentage}%` }"
    />
  </div>
</template>

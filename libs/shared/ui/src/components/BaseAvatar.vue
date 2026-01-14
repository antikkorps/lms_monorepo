<script setup lang="ts">
import { computed } from 'vue';

/**
 * BaseAvatar - User avatar component with fallback to initials
 * Supports DiceBear for generated avatars
 *
 * @example
 * <BaseAvatar src="/avatar.jpg" name="John Doe" size="md" />
 *
 * @example
 * <BaseAvatar name="Jane Smith" />
 */

export interface Props {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
});

const initials = computed(() => {
  if (!props.name) return '?';
  return props.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
});

const fallbackUrl = computed(() => {
  if (!props.name) return null;
  // DiceBear API for consistent avatar generation
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(props.name)}`;
});

const displaySrc = computed(() => props.src || fallbackUrl.value);
</script>

<template>
  <div
    :class="[
      'relative inline-flex items-center justify-center rounded-full bg-gray-200 overflow-hidden',
      {
        'h-6 w-6 text-xs': size === 'xs',
        'h-8 w-8 text-sm': size === 'sm',
        'h-10 w-10 text-base': size === 'md',
        'h-12 w-12 text-lg': size === 'lg',
        'h-16 w-16 text-xl': size === 'xl',
      },
    ]"
  >
    <img
      v-if="displaySrc"
      :src="displaySrc"
      :alt="name || 'Avatar'"
      class="h-full w-full object-cover"
      loading="lazy"
      @error="($event.target as HTMLImageElement).style.display = 'none'"
    />
    <span
      v-else
      class="font-medium text-gray-600"
    >
      {{ initials }}
    </span>
  </div>
</template>

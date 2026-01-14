<script setup lang="ts">
/**
 * BaseBadge - A badge/tag component for status indicators
 *
 * @example
 * <BaseBadge variant="success">Active</BaseBadge>
 *
 * @example
 * <BaseBadge variant="warning" size="sm">Pending</BaseBadge>
 */

export interface Props {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
});
</script>

<template>
  <span
    :class="[
      'inline-flex items-center font-medium rounded-full',
      {
        // Sizes
        'px-2 py-0.5 text-xs': size === 'sm',
        'px-2.5 py-1 text-sm': size === 'md',
        // Variants
        'bg-gray-100 text-gray-800': variant === 'default',
        'bg-primary-100 text-primary-800': variant === 'primary',
        'bg-green-100 text-green-800': variant === 'success',
        'bg-yellow-100 text-yellow-800': variant === 'warning',
        'bg-red-100 text-red-800': variant === 'danger',
        'bg-blue-100 text-blue-800': variant === 'info',
      },
    ]"
  >
    <slot />
  </span>
</template>

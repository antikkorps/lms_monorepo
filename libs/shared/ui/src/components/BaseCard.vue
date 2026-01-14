<script setup lang="ts">
/**
 * BaseCard - A flexible card container component
 *
 * @example
 * <BaseCard>
 *   <template #header>Card Title</template>
 *   Card content goes here
 *   <template #footer>Footer actions</template>
 * </BaseCard>
 */

export interface Props {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

withDefaults(defineProps<Props>(), {
  padding: 'md',
  hoverable: false,
});
</script>

<template>
  <div
    :class="[
      'bg-white rounded-xl shadow-sm border border-gray-200',
      'transition-shadow duration-200',
      {
        'hover:shadow-md': hoverable,
        'p-0': padding === 'none',
        'p-4': padding === 'sm',
        'p-6': padding === 'md',
        'p-8': padding === 'lg',
      },
    ]"
  >
    <div v-if="$slots.header" class="border-b border-gray-200 -mx-6 -mt-6 px-6 py-4 mb-4">
      <slot name="header" />
    </div>

    <slot />

    <div v-if="$slots.footer" class="border-t border-gray-200 -mx-6 -mb-6 px-6 py-4 mt-4">
      <slot name="footer" />
    </div>
  </div>
</template>

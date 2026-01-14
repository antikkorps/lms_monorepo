<script setup lang="ts">
/**
 * BaseButton - A flexible button component
 *
 * @example
 * <BaseButton variant="primary" size="md" @click="handleClick">
 *   Click me
 * </BaseButton>
 *
 * @example
 * <BaseButton variant="secondary" :loading="isLoading" :disabled="!isValid">
 *   Submit
 * </BaseButton>
 */

export interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  loading: false,
  disabled: false,
  fullWidth: false,
});

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      {
        // Variants
        'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500':
          variant === 'primary',
        'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500':
          variant === 'secondary',
        'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500':
          variant === 'outline',
        'text-gray-700 hover:bg-gray-100 focus:ring-gray-500': variant === 'ghost',
        'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500':
          variant === 'danger',
        // Sizes
        'px-3 py-1.5 text-sm': size === 'sm',
        'px-4 py-2 text-sm': size === 'md',
        'px-6 py-3 text-base': size === 'lg',
        // Full width
        'w-full': fullWidth,
      },
    ]"
    @click="$emit('click', $event)"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <slot />
  </button>
</template>

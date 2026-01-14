<script setup lang="ts">
import { watch } from 'vue';

/**
 * BaseModal - An accessible modal dialog component
 *
 * @example
 * <BaseModal v-model:open="isOpen" title="Confirm Action">
 *   Are you sure you want to proceed?
 *   <template #footer>
 *     <BaseButton @click="confirm">Confirm</BaseButton>
 *   </template>
 * </BaseModal>
 */

export interface Props {
  open: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closeOnOverlay: true,
  closeOnEscape: true,
});

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

function close() {
  emit('update:open', false);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.closeOnEscape) {
    close();
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeydown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    }
  }
);
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <!-- Overlay -->
        <div
          class="fixed inset-0 bg-black/50 transition-opacity"
          @click="closeOnOverlay && close()"
        />

        <!-- Modal container -->
        <div class="flex min-h-full items-center justify-center p-4">
          <Transition
            enter-active-class="duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="open"
              :class="[
                'relative bg-white rounded-xl shadow-xl transform transition-all',
                {
                  'max-w-sm w-full': size === 'sm',
                  'max-w-md w-full': size === 'md',
                  'max-w-lg w-full': size === 'lg',
                  'max-w-2xl w-full': size === 'xl',
                },
              ]"
            >
              <!-- Header -->
              <div
                v-if="title || $slots.header"
                class="flex items-center justify-between px-6 py-4 border-b border-gray-200"
              >
                <slot name="header">
                  <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
                </slot>
                <button
                  type="button"
                  class="text-gray-400 hover:text-gray-500 focus:outline-none"
                  @click="close"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Body -->
              <div class="px-6 py-4">
                <slot />
              </div>

              <!-- Footer -->
              <div
                v-if="$slots.footer"
                class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200"
              >
                <slot name="footer" />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

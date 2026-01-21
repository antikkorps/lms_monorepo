<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-vue-next';

interface Props {
  modelValue: string;
  placeholder?: string;
  class?: HTMLAttributes['class'];
  disabled?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select...',
  disabled: false,
});

const emit = defineEmits<Emits>();

const selectClass = computed(() =>
  cn(
    'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none',
    props.class,
  ),
);

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('update:modelValue', target.value);
}
</script>

<template>
  <div class="relative">
    <select
      :value="modelValue"
      :disabled="disabled"
      :class="selectClass"
      @change="handleChange"
    >
      <slot />
    </select>
    <ChevronDown
      class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
    />
  </div>
</template>

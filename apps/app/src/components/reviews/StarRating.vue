<script setup lang="ts">
import { computed } from 'vue';
import { Star } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    modelValue?: number;
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    modelValue: 0,
    readonly: false,
    size: 'md',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-4 w-4';
    case 'lg':
      return 'h-6 w-6';
    default:
      return 'h-5 w-5';
  }
});

function handleClick(star: number) {
  if (!props.readonly) {
    emit('update:modelValue', star);
  }
}
</script>

<template>
  <div class="inline-flex items-center gap-0.5">
    <button
      v-for="star in 5"
      :key="star"
      type="button"
      :disabled="readonly"
      :class="[
        'transition-colors focus:outline-none',
        !readonly && 'cursor-pointer hover:scale-110',
        readonly && 'cursor-default',
      ]"
      @click="handleClick(star)"
    >
      <Star
        :class="[
          sizeClasses,
          star <= modelValue
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-none text-gray-300',
        ]"
      />
    </button>
  </div>
</template>

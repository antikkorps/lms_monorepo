<script setup lang="ts">
/**
 * BaseInput - A flexible input component with label and error support
 *
 * @example
 * <BaseInput
 *   v-model="email"
 *   label="Email"
 *   type="email"
 *   placeholder="you@example.com"
 *   :error="errors.email"
 * />
 */

export interface Props {
  modelValue?: string | number;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  disabled: false,
  required: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
}>();

const inputId = props.id || `input-${Math.random().toString(36).slice(2, 9)}`;

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', props.type === 'number' ? Number(target.value) : target.value);
}
</script>

<template>
  <div class="w-full">
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :class="[
        'w-full px-4 py-2 border rounded-lg transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:border-transparent',
        'placeholder:text-gray-400',
        'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
        error
          ? 'border-red-300 focus:ring-red-500'
          : 'border-gray-300 focus:ring-primary-500',
      ]"
      @input="handleInput"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    />

    <p v-if="error" class="mt-1 text-sm text-red-600">
      {{ error }}
    </p>
    <p v-else-if="hint" class="mt-1 text-sm text-gray-500">
      {{ hint }}
    </p>
  </div>
</template>

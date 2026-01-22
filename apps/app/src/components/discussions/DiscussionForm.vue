<script setup lang="ts">
import { ref } from 'vue';
import { Send, Loader2 } from 'lucide-vue-next';

interface Props {
  placeholder?: string;
  submitLabel?: string;
  isLoading?: boolean;
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Share your thoughts or ask a question...',
  submitLabel: 'Post',
  isLoading: false,
});

const emit = defineEmits<{
  (e: 'submit', content: string): void;
}>();

const content = ref('');

function handleSubmit() {
  const trimmed = content.value.trim();
  if (trimmed) {
    emit('submit', trimmed);
    content.value = '';
  }
}

function handleKeydown(event: KeyboardEvent) {
  // Submit on Cmd+Enter or Ctrl+Enter
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    handleSubmit();
  }
}
</script>

<template>
  <form class="space-y-3" @submit.prevent="handleSubmit">
    <div class="relative">
      <textarea
        v-model="content"
        :placeholder="placeholder"
        rows="3"
        class="w-full resize-none rounded-lg border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        :disabled="isLoading"
        @keydown="handleKeydown"
      />
    </div>
    <div class="flex items-center justify-between">
      <span class="text-xs text-muted-foreground">
        Press <kbd class="rounded border bg-muted px-1.5 py-0.5 text-xs">Cmd</kbd> +
        <kbd class="rounded border bg-muted px-1.5 py-0.5 text-xs">Enter</kbd> to submit
      </span>
      <button
        type="submit"
        :disabled="!content.trim() || isLoading"
        class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin" />
        <Send v-else class="h-4 w-4" />
        <span>{{ submitLabel }}</span>
      </button>
    </div>
  </form>
</template>

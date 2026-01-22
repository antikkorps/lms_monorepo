<script setup lang="ts">
import { ref } from 'vue';
import { Send, Loader2 } from 'lucide-vue-next';

interface Props {
  isLoading?: boolean;
}

withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<{
  (e: 'submit', content: string): void;
  (e: 'cancel'): void;
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
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    handleSubmit();
  }
  if (event.key === 'Escape') {
    emit('cancel');
  }
}
</script>

<template>
  <form class="space-y-2" @submit.prevent="handleSubmit">
    <textarea
      v-model="content"
      placeholder="Write a reply..."
      rows="2"
      class="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
      :disabled="isLoading"
      @keydown="handleKeydown"
    />
    <div class="flex items-center justify-end gap-2">
      <button
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="submit"
        :disabled="!content.trim() || isLoading"
        class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Loader2 v-if="isLoading" class="h-3.5 w-3.5 animate-spin" />
        <Send v-else class="h-3.5 w-3.5" />
        <span>Reply</span>
      </button>
    </div>
  </form>
</template>

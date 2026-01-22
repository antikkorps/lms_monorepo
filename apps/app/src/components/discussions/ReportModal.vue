<script setup lang="ts">
import type { ReportInput, ReportReason } from '@shared/types';
import { ref, watch } from 'vue';
import { X, AlertTriangle } from 'lucide-vue-next';

interface Props {
  open: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', input: ReportInput): void;
}>();

const reasons: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'off_topic', label: 'Off-topic or irrelevant' },
  { value: 'other', label: 'Other' },
];

const selectedReason = ref<ReportReason | ''>('');
const description = ref('');

function handleSubmit() {
  if (!selectedReason.value) return;

  emit('submit', {
    reason: selectedReason.value,
    description: description.value.trim() || undefined,
  });

  // Reset form
  selectedReason.value = '';
  description.value = '';
}

function handleClose() {
  selectedReason.value = '';
  description.value = '';
  emit('close');
}

// Close on escape key
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/50"
        @click="handleClose"
      />

      <!-- Modal -->
      <div class="relative z-10 w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <AlertTriangle class="h-5 w-5 text-yellow-500" />
            <h2 class="text-lg font-semibold">Report Content</h2>
          </div>
          <button
            class="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            @click="handleClose"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <p class="mt-2 text-sm text-muted-foreground">
          Help us understand what's wrong with this content. Reports are anonymous.
        </p>

        <!-- Form -->
        <form class="mt-4 space-y-4" @submit.prevent="handleSubmit">
          <!-- Reason selection -->
          <div class="space-y-2">
            <label class="text-sm font-medium">Reason for reporting</label>
            <div class="space-y-2">
              <label
                v-for="reason in reasons"
                :key="reason.value"
                class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
                :class="{
                  'border-primary bg-primary/5': selectedReason === reason.value,
                  'hover:border-muted-foreground/50': selectedReason !== reason.value,
                }"
              >
                <input
                  v-model="selectedReason"
                  type="radio"
                  :value="reason.value"
                  class="sr-only"
                />
                <div
                  class="flex h-4 w-4 items-center justify-center rounded-full border-2"
                  :class="{
                    'border-primary': selectedReason === reason.value,
                    'border-muted-foreground/30': selectedReason !== reason.value,
                  }"
                >
                  <div
                    v-if="selectedReason === reason.value"
                    class="h-2 w-2 rounded-full bg-primary"
                  />
                </div>
                <span class="text-sm">{{ reason.label }}</span>
              </label>
            </div>
          </div>

          <!-- Additional details -->
          <div class="space-y-2">
            <label for="report-description" class="text-sm font-medium">
              Additional details (optional)
            </label>
            <textarea
              id="report-description"
              v-model="description"
              placeholder="Provide more context about this report..."
              rows="3"
              class="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              @click="handleClose"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!selectedReason"
              class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

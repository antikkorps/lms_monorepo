<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { Save, Trash2, Loader2, FileText, AlertCircle } from 'lucide-vue-next';
import { useNote } from '@/composables/useNote';
import { useToast } from '@/composables/useToast';

interface Props {
  lessonId: string;
}

const props = defineProps<Props>();

const {
  currentNote,
  isLoading,
  error,
  isSaving,
  hasUnsavedChanges,
  localContent,
  fetchNote,
  saveNote,
  deleteNote,
  updateLocalContent,
  discardChanges,
  clearError,
} = useNote(props.lessonId);

const toast = useToast();
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// Load note on mount
onMounted(() => {
  fetchNote();
});

// Watch for lessonId changes
watch(
  () => props.lessonId,
  (newId) => {
    if (newId) {
      fetchNote();
    }
  }
);

// Watch for errors
watch(error, (err) => {
  if (err) {
    toast.error(err);
    clearError();
  }
});

// Handle textarea input
function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  updateLocalContent(target.value);
}

// Handle save
async function handleSave() {
  const result = await saveNote();
  if (result) {
    toast.success('Note saved');
  }
}

// Handle delete
async function handleDelete() {
  if (!currentNote.value) return;

  if (confirm('Are you sure you want to delete this note?')) {
    const success = await deleteNote();
    if (success) {
      toast.success('Note deleted');
    }
  }
}

// Handle keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  // Save on Cmd+S or Ctrl+S
  if (event.key === 's' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    if (hasUnsavedChanges.value) {
      handleSave();
    }
  }
}

// Auto-resize textarea
function autoResize() {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
    textareaRef.value.style.height = `${Math.max(200, textareaRef.value.scrollHeight)}px`;
  }
}

// Watch content changes for auto-resize
watch(localContent, () => {
  setTimeout(autoResize, 0);
});

const characterCount = computed(() => localContent.value.length);
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <FileText class="h-5 w-5 text-muted-foreground" />
        <h3 class="font-medium">Personal Notes</h3>
      </div>
      <div class="flex items-center gap-2">
        <!-- Unsaved indicator -->
        <span
          v-if="hasUnsavedChanges"
          class="flex items-center gap-1 text-xs text-yellow-600"
        >
          <AlertCircle class="h-3 w-3" />
          Unsaved changes
        </span>

        <!-- Delete button -->
        <button
          v-if="currentNote"
          class="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Delete note"
          :disabled="isSaving"
          @click="handleDelete"
        >
          <Trash2 class="h-4 w-4" />
        </button>

        <!-- Save button -->
        <button
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!hasUnsavedChanges || isSaving"
          @click="handleSave"
        >
          <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          <span>Save</span>
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Editor -->
    <div v-else class="space-y-2">
      <textarea
        ref="textareaRef"
        :value="localContent"
        placeholder="Write your personal notes here. Only you can see these notes..."
        class="min-h-[200px] w-full resize-none rounded-lg border bg-background px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        :disabled="isSaving"
        @input="handleInput"
        @keydown="handleKeydown"
      />

      <!-- Footer -->
      <div class="flex items-center justify-between text-xs text-muted-foreground">
        <span>{{ characterCount }} characters</span>
        <span>
          Press <kbd class="rounded border bg-muted px-1.5 py-0.5">Cmd</kbd> +
          <kbd class="rounded border bg-muted px-1.5 py-0.5">S</kbd> to save
        </span>
      </div>
    </div>

    <!-- Discard changes prompt -->
    <div
      v-if="hasUnsavedChanges && currentNote"
      class="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-3"
    >
      <span class="text-sm text-yellow-800">
        You have unsaved changes
      </span>
      <button
        class="text-sm font-medium text-yellow-700 hover:text-yellow-900"
        @click="discardChanges"
      >
        Discard
      </button>
    </div>
  </div>
</template>

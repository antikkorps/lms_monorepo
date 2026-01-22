<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import {
  Save,
  Trash2,
  Loader2,
  FileText,
  AlertCircle,
  Eye,
  Edit3,
  Download,
} from 'lucide-vue-next';
import { useNote } from '@/composables/useNote';
import { useToast } from '@/composables/useToast';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

interface Props {
  lessonId: string;
  lessonTitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  lessonTitle: 'Lesson Notes',
});

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
const previewRef = ref<HTMLDivElement | null>(null);

// Markdown parser instance
const md = new MarkdownIt({
  html: false, // Disable HTML tags in source
  breaks: true, // Convert \n to <br>
  linkify: true, // Auto-convert URLs to links
  typographer: true, // Smart quotes and other typographic replacements
});

// View mode: 'edit' or 'preview'
type ViewMode = 'edit' | 'preview';
const viewMode = ref<ViewMode>('edit');
const isExporting = ref(false);

// Render markdown content safely
const renderedContent = computed(() => {
  if (!localContent.value) return '';
  const rawHtml = md.render(localContent.value);
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote',
      'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
});

// Load note on mount
onMounted(() => {
  fetchNote();
});

// Watch for lessonId changes
watch(
  () => props.lessonId,
  (newId) => {
    if (newId) {
      viewMode.value = 'edit';
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

// Export to PDF
async function exportToPdf() {
  if (!localContent.value) {
    toast.error('Nothing to export');
    return;
  }

  isExporting.value = true;

  try {
    // Dynamically import html2pdf to avoid SSR issues
    const html2pdf = (await import('html2pdf.js')).default;

    // Create a temporary container with styled content
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 800px;">
        <h1 style="font-size: 24px; margin-bottom: 8px; color: #1a1a1a;">${props.lessonTitle}</h1>
        <p style="font-size: 12px; color: #666; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e5e5;">
          Exported on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <div class="note-content" style="font-size: 14px; line-height: 1.7; color: #333;">
          ${renderedContent.value}
        </div>
      </div>
    `;

    // Add some basic styles for markdown elements
    const style = document.createElement('style');
    style.textContent = `
      .note-content h1, .note-content h2, .note-content h3 { margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; }
      .note-content h1 { font-size: 1.5em; }
      .note-content h2 { font-size: 1.3em; }
      .note-content h3 { font-size: 1.1em; }
      .note-content p { margin-bottom: 1em; }
      .note-content ul, .note-content ol { margin-bottom: 1em; padding-left: 2em; }
      .note-content li { margin-bottom: 0.25em; }
      .note-content code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }
      .note-content pre { background: #f4f4f4; padding: 1em; border-radius: 6px; overflow-x: auto; margin-bottom: 1em; }
      .note-content pre code { background: none; padding: 0; }
      .note-content blockquote { border-left: 3px solid #ddd; margin: 1em 0; padding-left: 1em; color: #666; }
      .note-content a { color: #2563eb; text-decoration: underline; }
      .note-content hr { border: none; border-top: 1px solid #e5e5e5; margin: 2em 0; }
      .note-content table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
      .note-content th, .note-content td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      .note-content th { background: #f4f4f4; font-weight: 600; }
    `;
    container.appendChild(style);

    // Generate filename
    const filename = `notes-${props.lessonTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

    // Generate PDF
    await html2pdf()
      .set({
        margin: [15, 15, 15, 15],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(container)
      .save();

    toast.success('PDF exported successfully');
  } catch (err) {
    console.error('PDF export error:', err);
    toast.error('Failed to export PDF');
  } finally {
    isExporting.value = false;
  }
}

const characterCount = computed(() => localContent.value.length);
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <FileText class="h-5 w-5 text-muted-foreground" />
        <h3 class="font-medium">Personal Notes</h3>
        <span class="text-xs text-muted-foreground">(Markdown supported)</span>
      </div>
      <div class="flex items-center gap-2">
        <!-- Unsaved indicator -->
        <span
          v-if="hasUnsavedChanges"
          class="flex items-center gap-1 text-xs text-yellow-600"
        >
          <AlertCircle class="h-3 w-3" />
          Unsaved
        </span>

        <!-- Export PDF button -->
        <button
          v-if="localContent"
          class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Export as PDF"
          :disabled="isExporting || isSaving"
          @click="exportToPdf"
        >
          <Loader2 v-if="isExporting" class="h-4 w-4 animate-spin" />
          <Download v-else class="h-4 w-4" />
        </button>

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
      <!-- View mode tabs -->
      <div class="flex border-b">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border-b-2 transition-colors"
          :class="viewMode === 'edit'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'"
          @click="viewMode = 'edit'"
        >
          <Edit3 class="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border-b-2 transition-colors"
          :class="viewMode === 'preview'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'"
          @click="viewMode = 'preview'"
        >
          <Eye class="h-3.5 w-3.5" />
          Preview
        </button>
      </div>

      <!-- Edit mode -->
      <textarea
        v-show="viewMode === 'edit'"
        ref="textareaRef"
        :value="localContent"
        placeholder="Write your personal notes here using Markdown...

# Heading
**bold** and *italic*
- List item
- Another item

> Quote

`code`"
        class="min-h-[200px] w-full resize-none rounded-lg border bg-background px-4 py-3 font-mono text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        :disabled="isSaving"
        @input="handleInput"
        @keydown="handleKeydown"
      />

      <!-- Preview mode -->
      <div
        v-show="viewMode === 'preview'"
        ref="previewRef"
        class="min-h-[200px] w-full rounded-lg border bg-background px-4 py-3"
      >
        <div
          v-if="renderedContent"
          class="prose prose-sm max-w-none dark:prose-invert"
          v-html="renderedContent"
        />
        <p v-else class="text-sm text-muted-foreground italic">
          Nothing to preview. Start writing in the Edit tab.
        </p>
      </div>

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
      class="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950"
    >
      <span class="text-sm text-yellow-800 dark:text-yellow-200">
        You have unsaved changes
      </span>
      <button
        class="text-sm font-medium text-yellow-700 hover:text-yellow-900 dark:text-yellow-300 dark:hover:text-yellow-100"
        @click="discardChanges"
      >
        Discard
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Prose styles for markdown preview */
.prose h1 { font-size: 1.5em; font-weight: 700; margin-top: 1.5em; margin-bottom: 0.5em; }
.prose h2 { font-size: 1.3em; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; }
.prose h3 { font-size: 1.1em; font-weight: 600; margin-top: 1.25em; margin-bottom: 0.5em; }
.prose p { margin-bottom: 1em; line-height: 1.7; }
.prose ul, .prose ol { margin-bottom: 1em; padding-left: 1.5em; }
.prose li { margin-bottom: 0.25em; }
.prose code {
  background: hsl(var(--muted));
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
  font-size: 0.875em;
  font-family: ui-monospace, monospace;
}
.prose pre {
  background: hsl(var(--muted));
  padding: 1em;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1em;
}
.prose pre code { background: none; padding: 0; }
.prose blockquote {
  border-left: 3px solid hsl(var(--border));
  margin: 1em 0;
  padding-left: 1em;
  color: hsl(var(--muted-foreground));
  font-style: italic;
}
.prose a { color: hsl(var(--primary)); text-decoration: underline; }
.prose hr { border: none; border-top: 1px solid hsl(var(--border)); margin: 2em 0; }
.prose strong { font-weight: 600; }
.prose em { font-style: italic; }
.prose table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
.prose th, .prose td { border: 1px solid hsl(var(--border)); padding: 0.5em 0.75em; text-align: left; }
.prose th { background: hsl(var(--muted)); font-weight: 600; }
</style>

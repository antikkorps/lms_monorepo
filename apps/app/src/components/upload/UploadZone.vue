<script setup lang="ts">
/**
 * UploadZone Component
 * Drag & drop file upload zone with click-to-select
 */
import { ref, computed } from 'vue';
import { Upload, X, FileVideo, FileImage, FileText, AlertCircle } from 'lucide-vue-next';
import { useUpload, type FileCategory, type UploadResult } from '@/composables/useUpload';

const props = withDefaults(
  defineProps<{
    /** File category: 'image' | 'video' | 'document' */
    category: FileCategory;
    /** Allow multiple files */
    multiple?: boolean;
    /** Custom label */
    label?: string;
    /** Show preview after upload */
    showPreview?: boolean;
    /** Disabled state */
    disabled?: boolean;
  }>(),
  {
    multiple: false,
    showPreview: true,
    disabled: false,
  }
);

const emit = defineEmits<{
  (e: 'upload', result: UploadResult): void;
  (e: 'uploadMultiple', results: UploadResult[]): void;
  (e: 'error', message: string): void;
  (e: 'delete', key: string): void;
}>();

const { upload, uploadMultiple, deleteFile, isUploading, progress, error, result, getAllowedTypes, formatFileSize, reset } = useUpload();

const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const uploadedFiles = ref<UploadResult[]>([]);

const allowedTypes = computed(() => getAllowedTypes(props.category));

const categoryIcon = computed(() => {
  switch (props.category) {
    case 'image':
      return FileImage;
    case 'video':
      return FileVideo;
    case 'document':
      return FileText;
    default:
      return Upload;
  }
});

const categoryLabel = computed(() => {
  if (props.label) return props.label;
  switch (props.category) {
    case 'image':
      return 'Déposez une image ici';
    case 'video':
      return 'Déposez une vidéo ici';
    case 'document':
      return 'Déposez un document ici';
    default:
      return 'Déposez un fichier ici';
  }
});

function openFileDialog() {
  if (props.disabled || isUploading.value) return;
  fileInput.value?.click();
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (props.disabled || isUploading.value) return;
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

async function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;

  if (props.disabled || isUploading.value) return;

  const files = Array.from(event.dataTransfer?.files || []);
  if (files.length === 0) return;

  await processFiles(files);
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  if (files.length === 0) return;

  await processFiles(files);

  // Reset input
  input.value = '';
}

async function processFiles(files: File[]) {
  reset();

  if (props.multiple) {
    const results = await uploadMultiple(files, props.category);
    const successfulResults = results.filter((r): r is UploadResult => r !== null);

    if (successfulResults.length > 0) {
      uploadedFiles.value.push(...successfulResults);
      emit('uploadMultiple', successfulResults);
    }
  } else {
    const file = files[0];
    const uploadResult = await upload(file, props.category);

    if (uploadResult) {
      uploadedFiles.value = [uploadResult];
      emit('upload', uploadResult);
    }
  }

  if (error.value) {
    emit('error', error.value);
  }
}

async function removeFile(fileResult: UploadResult) {
  const success = await deleteFile(fileResult.key);
  if (success) {
    uploadedFiles.value = uploadedFiles.value.filter((f) => f.key !== fileResult.key);
    emit('delete', fileResult.key);
  }
}

function getFileNameFromKey(key: string): string {
  return key.split('/').pop() || key;
}
</script>

<template>
  <div class="space-y-3">
    <!-- Drop Zone -->
    <div
      class="relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer"
      :class="{
        'border-primary bg-primary/5': isDragging,
        'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50': !isDragging && !disabled,
        'border-muted-foreground/10 bg-muted/25 cursor-not-allowed': disabled,
        'pointer-events-none': isUploading,
      }"
      @click="openFileDialog"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="allowedTypes.accept"
        :multiple="multiple"
        :disabled="disabled || isUploading"
        @change="handleFileSelect"
      />

      <!-- Upload Icon & Text -->
      <div v-if="!isUploading" class="flex flex-col items-center gap-2 text-center">
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center"
          :class="disabled ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'"
        >
          <component :is="categoryIcon" class="w-6 h-6" />
        </div>
        <div>
          <p class="text-sm font-medium" :class="disabled ? 'text-muted-foreground' : 'text-foreground'">
            {{ categoryLabel }}
          </p>
          <p class="text-xs text-muted-foreground mt-1">
            ou cliquez pour sélectionner
          </p>
        </div>
        <p class="text-xs text-muted-foreground">
          Formats: {{ allowedTypes.extensions.join(', ') }} (max {{ allowedTypes.maxSizeLabel }})
        </p>
      </div>

      <!-- Progress -->
      <div v-else class="flex flex-col items-center gap-3">
        <div class="w-full max-w-xs">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-muted-foreground">Upload en cours...</span>
            <span class="font-medium">{{ progress?.percentage || 0 }}%</span>
          </div>
          <div class="h-2 bg-muted rounded-full overflow-hidden">
            <div
              class="h-full bg-primary transition-all duration-300"
              :style="{ width: `${progress?.percentage || 0}%` }"
            />
          </div>
          <p class="text-xs text-muted-foreground mt-1 text-center">
            {{ formatFileSize(progress?.loaded || 0) }} / {{ formatFileSize(progress?.total || 0) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
      <AlertCircle class="w-4 h-4 shrink-0" />
      <span>{{ error }}</span>
    </div>

    <!-- Uploaded Files Preview -->
    <div v-if="showPreview && uploadedFiles.length > 0" class="space-y-2">
      <div
        v-for="file in uploadedFiles"
        :key="file.key"
        class="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
      >
        <div class="flex items-center gap-3 min-w-0">
          <!-- Thumbnail for images -->
          <img
            v-if="category === 'image'"
            :src="file.url"
            :alt="getFileNameFromKey(file.key)"
            class="w-10 h-10 object-cover rounded"
          />
          <component
            v-else
            :is="categoryIcon"
            class="w-10 h-10 p-2 bg-background rounded text-muted-foreground"
          />
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">{{ getFileNameFromKey(file.key) }}</p>
            <p class="text-xs text-muted-foreground">{{ formatFileSize(file.size) }}</p>
          </div>
        </div>
        <button
          type="button"
          class="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
          @click.stop="removeFile(file)"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

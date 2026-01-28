/**
 * Upload Composable
 * Handles file uploads with progress tracking
 */

import { ref, computed } from 'vue';
import { useApi } from './useApi';

export type FileCategory = 'image' | 'video' | 'document';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface UploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  result: UploadResult | null;
}

const ALLOWED_TYPES = {
  image: {
    accept: 'image/jpeg,image/png,image/gif,image/webp',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    maxSizeLabel: '10MB',
  },
  video: {
    accept: 'video/mp4,video/webm,video/quicktime',
    extensions: ['.mp4', '.webm', '.mov'],
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    maxSizeLabel: '2GB',
  },
  document: {
    accept: 'application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extensions: ['.pdf', '.ppt', '.pptx', '.doc', '.docx'],
    maxSize: 100 * 1024 * 1024, // 100MB
    maxSizeLabel: '100MB',
  },
} as const;

export function useUpload() {
  const api = useApi();

  const state = ref<UploadState>({
    isUploading: false,
    progress: null,
    error: null,
    result: null,
  });

  const isUploading = computed(() => state.value.isUploading);
  const progress = computed(() => state.value.progress);
  const error = computed(() => state.value.error);
  const result = computed(() => state.value.result);

  /**
   * Get allowed file config for a category
   */
  function getAllowedTypes(category: FileCategory) {
    return ALLOWED_TYPES[category];
  }

  /**
   * Validate a file before upload
   */
  function validateFile(file: File, category: FileCategory): { valid: boolean; error?: string } {
    const config = ALLOWED_TYPES[category];

    // Check file type
    const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!config.extensions.includes(fileExt as typeof config.extensions[number])) {
      return {
        valid: false,
        error: `Type de fichier non autorisé. Formats acceptés: ${config.extensions.join(', ')}`,
      };
    }

    // Check file size
    if (file.size > config.maxSize) {
      return {
        valid: false,
        error: `Fichier trop volumineux. Taille maximum: ${config.maxSizeLabel}`,
      };
    }

    return { valid: true };
  }

  /**
   * Upload a file with progress tracking
   */
  async function upload(file: File, category: FileCategory): Promise<UploadResult | null> {
    // Validate file
    const validation = validateFile(file, category);
    if (!validation.valid) {
      state.value.error = validation.error || 'Fichier invalide';
      return null;
    }

    state.value.isUploading = true;
    state.value.progress = { loaded: 0, total: file.size, percentage: 0 };
    state.value.error = null;
    state.value.result = null;

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload with XMLHttpRequest for progress tracking
      const result = await uploadWithProgress(
        `/api/v1/uploads/${category}`,
        formData,
        (loaded, total) => {
          state.value.progress = {
            loaded,
            total,
            percentage: Math.round((loaded / total) * 100),
          };
        }
      );

      state.value.result = result;
      return result;
    } catch (err) {
      state.value.error = err instanceof Error ? err.message : 'Échec de l\'upload';
      return null;
    } finally {
      state.value.isUploading = false;
    }
  }

  /**
   * Upload multiple files
   */
  async function uploadMultiple(
    files: File[],
    category: FileCategory
  ): Promise<Array<UploadResult | null>> {
    const results: Array<UploadResult | null> = [];

    for (const file of files) {
      const result = await upload(file, category);
      results.push(result);
    }

    return results;
  }

  /**
   * Delete an uploaded file
   */
  async function deleteFile(key: string): Promise<boolean> {
    try {
      await api.delete(`/uploads/${encodeURIComponent(key)}`);
      return true;
    } catch (err) {
      state.value.error = err instanceof Error ? err.message : 'Échec de la suppression';
      return false;
    }
  }

  /**
   * Reset upload state
   */
  function reset(): void {
    state.value = {
      isUploading: false,
      progress: null,
      error: null,
      result: null,
    };
  }

  /**
   * Format file size for display
   */
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  return {
    // State
    state,
    isUploading,
    progress,
    error,
    result,

    // Methods
    upload,
    uploadMultiple,
    deleteFile,
    reset,
    validateFile,
    getAllowedTypes,
    formatFileSize,
  };
}

/**
 * Upload file with XMLHttpRequest for progress tracking
 */
function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (loaded: number, total: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded, event.total);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response.data);
        } catch {
          reject(new Error('Invalid response'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error?.message || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', url);
    xhr.withCredentials = true; // Include cookies for auth
    xhr.send(formData);
  });
}

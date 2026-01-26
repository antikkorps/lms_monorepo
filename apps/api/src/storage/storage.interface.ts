/**
 * Storage Interface
 * Abstract interface for file storage providers
 */

export interface UploadOptions {
  /** Target folder/prefix (e.g., 'videos', 'images', 'documents') */
  folder?: string;
  /** Custom filename (without extension). If not provided, a UUID is generated */
  filename?: string;
  /** Content type override */
  contentType?: string;
  /** Whether the file should be publicly accessible */
  isPublic?: boolean;
  /** Custom metadata */
  metadata?: Record<string, string>;
}

export interface UploadResult {
  /** Unique key/path to the file */
  key: string;
  /** Public URL (if available) */
  url: string;
  /** File size in bytes */
  size: number;
  /** Content type */
  contentType: string;
  /** Storage provider used */
  provider: string;
}

export interface SignedUrlOptions {
  /** Expiry time in seconds (default: 3600 = 1 hour) */
  expiresIn?: number;
  /** For uploads: content type */
  contentType?: string;
}

export interface StorageProvider {
  /** Provider name */
  readonly name: string;

  /**
   * Upload a file
   */
  upload(file: Buffer, originalName: string, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Delete a file
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a file exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get a signed URL for private file access
   */
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;

  /**
   * Get a signed URL for direct upload (bypassing server)
   */
  getSignedUploadUrl(key: string, options?: SignedUrlOptions): Promise<string>;

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string;
}

/**
 * Supported file types with validation
 */
export const ALLOWED_FILE_TYPES = {
  image: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  video: {
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    extensions: ['.mp4', '.webm', '.mov'],
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
  },
  document: {
    mimeTypes: [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    extensions: ['.pdf', '.ppt', '.pptx', '.doc', '.docx'],
    maxSize: 100 * 1024 * 1024, // 100MB
  },
} as const;

export type FileCategory = keyof typeof ALLOWED_FILE_TYPES;

/**
 * Validate file type and size
 */
export function validateFile(
  file: { mimetype: string; size: number; originalname: string },
  category: FileCategory
): { valid: boolean; error?: string } {
  const fileConfig = ALLOWED_FILE_TYPES[category];
  const mimeTypes = fileConfig.mimeTypes as readonly string[];
  const extensions = fileConfig.extensions as readonly string[];

  if (!mimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${extensions.join(', ')}`,
    };
  }

  if (file.size > fileConfig.maxSize) {
    const maxSizeMB = Math.round(fileConfig.maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Local Storage Provider
 * Stores files on the local filesystem (for development)
 */

import { mkdir, writeFile, unlink, access, constants } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import type { StorageProvider, UploadOptions, UploadResult, SignedUrlOptions } from './storage.interface.js';
import { config } from '../config/index.js';

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local';
  private basePath: string;
  private baseUrl: string;

  constructor() {
    this.basePath = config.storage?.localPath || './uploads';
    // In dev, serve from the API server
    this.baseUrl = `http://localhost:${config.port}/uploads`;
  }

  async upload(file: Buffer, originalName: string, options: UploadOptions = {}): Promise<UploadResult> {
    const folder = options.folder || 'misc';
    const ext = extname(originalName);
    const filename = options.filename || randomUUID();
    const key = `${folder}/${filename}${ext}`;

    // Ensure directory exists
    const dirPath = join(this.basePath, folder);
    await mkdir(dirPath, { recursive: true });

    // Write file
    const filePath = join(this.basePath, key);
    await writeFile(filePath, file);

    return {
      key,
      url: this.getPublicUrl(key),
      size: file.length,
      contentType: options.contentType || this.guessContentType(ext),
      provider: this.name,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.basePath, key);
    try {
      await unlink(filePath);
    } catch (err) {
      // Ignore if file doesn't exist
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = join(this.basePath, key);
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string, _options?: SignedUrlOptions): Promise<string> {
    // Local storage doesn't support signed URLs, just return public URL
    return this.getPublicUrl(key);
  }

  async getSignedUploadUrl(_key: string, _options?: SignedUrlOptions): Promise<string> {
    // Local storage doesn't support direct uploads
    throw new Error('Direct upload not supported in local storage. Use server upload.');
  }

  getPublicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }

  private guessContentType(ext: string): string {
    const types: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
    return types[ext.toLowerCase()] || 'application/octet-stream';
  }
}

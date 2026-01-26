/**
 * Cloudflare R2 Storage Provider
 * Uses S3-compatible API
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type { StorageProvider, UploadOptions, UploadResult, SignedUrlOptions } from './storage.interface.js';
import { config } from '../config/index.js';

export class R2StorageProvider implements StorageProvider {
  readonly name = 'r2';
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    const accountId = config.storage?.r2AccountId;
    const accessKeyId = config.storage?.r2AccessKeyId;
    const secretAccessKey = config.storage?.r2SecretAccessKey;
    const bucket = config.storage?.r2BucketName;
    const publicUrl = config.storage?.r2PublicUrl;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error('R2 storage configuration missing. Check R2_* environment variables.');
    }

    this.bucket = bucket;
    this.publicUrl = publicUrl || '';

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async upload(file: Buffer, originalName: string, options: UploadOptions = {}): Promise<UploadResult> {
    const folder = options.folder || 'misc';
    const ext = extname(originalName);
    const filename = options.filename || randomUUID();
    const key = `${folder}/${filename}${ext}`;

    const contentType = options.contentType || this.guessContentType(ext);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      Metadata: options.metadata,
      // R2 doesn't use ACLs, public access is controlled at bucket level
    });

    await this.client.send(command);

    return {
      key,
      url: this.getPublicUrl(key),
      size: file.length,
      contentType,
      provider: this.name,
    };
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      if ((err as { name?: string }).name === 'NotFound') {
        return false;
      }
      throw err;
    }
  }

  async getSignedUrl(key: string, options: SignedUrlOptions = {}): Promise<string> {
    const expiresIn = options.expiresIn || 3600; // 1 hour default

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getSignedUploadUrl(key: string, options: SignedUrlOptions = {}): Promise<string> {
    const expiresIn = options.expiresIn || 3600;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: options.contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  getPublicUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }
    // Fallback: use signed URL if no public URL configured
    // This is async so we can't use it directly here
    // Return a placeholder that indicates signed URL is needed
    return `r2://${this.bucket}/${key}`;
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

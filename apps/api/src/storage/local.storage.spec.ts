import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalStorageProvider } from './local.storage.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
vi.mock('fs/promises');
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join('/')),
  };
});

// Mock config
vi.mock('../config/index.js', () => ({
  config: {
    port: 3000,
    storage: {
      localPath: './test-uploads',
    },
  },
}));

describe('LocalStorageProvider', () => {
  let provider: LocalStorageProvider;
  const mockFs = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.mkdir.mockResolvedValue(undefined);
    provider = new LocalStorageProvider();
  });

  describe('constructor', () => {
    it('should have name "local"', () => {
      expect(provider.name).toBe('local');
    });
  });

  describe('upload', () => {
    it('should upload a file and return result', async () => {
      const file = Buffer.from('test content');
      const originalName = 'test-image.jpg';

      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await provider.upload(file, originalName, {
        folder: 'images',
      });

      expect(result.key).toMatch(/^images\/[a-f0-9-]+\.jpg$/);
      expect(result.size).toBe(file.length);
      expect(result.contentType).toBe('image/jpeg');
      expect(result.provider).toBe('local');
      expect(result.url).toContain('/uploads/');
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should use custom filename if provided', async () => {
      const file = Buffer.from('test');
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await provider.upload(file, 'original.png', {
        folder: 'images',
        filename: 'custom-name',
      });

      expect(result.key).toBe('images/custom-name.png');
    });

    it('should default to misc folder', async () => {
      const file = Buffer.from('test');
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await provider.upload(file, 'test.pdf');

      expect(result.key).toMatch(/^misc\//);
    });
  });

  describe('delete', () => {
    it('should delete a file', async () => {
      mockFs.unlink.mockResolvedValue(undefined);

      await provider.delete('images/test.jpg');

      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('images/test.jpg')
      );
    });

    it('should not throw if file does not exist', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.unlink.mockRejectedValue(error);

      await expect(provider.delete('nonexistent.jpg')).resolves.not.toThrow();
    });

    it('should throw on other errors', async () => {
      mockFs.unlink.mockRejectedValue(new Error('Permission denied'));

      await expect(provider.delete('test.jpg')).rejects.toThrow('Permission denied');
    });
  });

  describe('exists', () => {
    it('should return true if file exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const exists = await provider.exists('images/test.jpg');

      expect(exists).toBe(true);
    });

    it('should return false if file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const exists = await provider.exists('nonexistent.jpg');

      expect(exists).toBe(false);
    });
  });

  describe('getPublicUrl', () => {
    it('should return a full URL with /uploads prefix', () => {
      const url = provider.getPublicUrl('images/test.jpg');

      expect(url).toBe('http://localhost:3000/uploads/images/test.jpg');
    });
  });

  describe('getSignedUrl', () => {
    it('should return the public URL (no signing for local)', async () => {
      const url = await provider.getSignedUrl('images/test.jpg');

      expect(url).toBe('http://localhost:3000/uploads/images/test.jpg');
    });
  });

  describe('getSignedUploadUrl', () => {
    it('should throw error (not supported for local)', async () => {
      await expect(provider.getSignedUploadUrl('test.jpg')).rejects.toThrow(
        'Direct upload not supported'
      );
    });
  });
});

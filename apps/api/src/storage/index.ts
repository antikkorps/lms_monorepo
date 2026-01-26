/**
 * Storage Module
 * Factory for storage providers
 */

import type { StorageProvider } from './storage.interface.js';
import { LocalStorageProvider } from './local.storage.js';
import { R2StorageProvider } from './r2.storage.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export * from './storage.interface.js';

let storageInstance: StorageProvider | null = null;

/**
 * Get the configured storage provider (singleton)
 */
export function getStorage(): StorageProvider {
  if (!storageInstance) {
    const provider = config.storage?.provider || 'local';

    switch (provider) {
      case 'r2':
        logger.info('Initializing R2 storage provider');
        storageInstance = new R2StorageProvider();
        break;
      case 'local':
      default:
        logger.info('Initializing local storage provider');
        storageInstance = new LocalStorageProvider();
        break;
    }
  }

  return storageInstance;
}

/**
 * Reset storage instance (for testing)
 */
export function resetStorage(): void {
  storageInstance = null;
}

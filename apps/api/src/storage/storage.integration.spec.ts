/**
 * Storage Integration Tests
 *
 * These tests require real R2 credentials to run.
 * They are skipped by default and can be enabled by setting:
 *   R2_INTEGRATION_TEST=true
 *
 * Required environment variables:
 *   - CLOUDFLARE_ACCOUNT_ID
 *   - R2_ACCESS_KEY_ID
 *   - R2_SECRET_ACCESS_KEY
 *   - R2_BUCKET_NAME
 *
 * Run with: R2_INTEGRATION_TEST=true npx vitest run storage.integration.spec.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const SHOULD_RUN = process.env.R2_INTEGRATION_TEST === 'true';

// Helper to conditionally run tests
const itif = (condition: boolean) => (condition ? it : it.skip);

describe('R2 Storage Integration Tests', () => {
  // Skip entire suite if not enabled
  const runTest = itif(SHOULD_RUN);

  let provider: any;
  let testFileKey: string;

  beforeAll(async () => {
    if (!SHOULD_RUN) {
      console.log('⏭️  Skipping R2 integration tests (set R2_INTEGRATION_TEST=true to run)');
      return;
    }

    // Check required env vars
    const required = [
      'CLOUDFLARE_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
    ];

    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    }

    // Import dynamically to avoid config issues when not running
    const { R2StorageProvider } = await import('./r2.storage.js');
    provider = new R2StorageProvider();
  });

  afterAll(async () => {
    if (!SHOULD_RUN || !provider || !testFileKey) return;

    // Cleanup: delete test file
    try {
      await provider.delete(testFileKey);
      console.log(`🧹 Cleaned up test file: ${testFileKey}`);
    } catch (err) {
      console.warn(`⚠️  Failed to cleanup test file: ${testFileKey}`);
    }
  });

  runTest('should upload a file to R2', async () => {
    const testContent = `Test file created at ${new Date().toISOString()}`;
    const file = Buffer.from(testContent);

    const result = await provider.upload(file, 'integration-test.txt', {
      folder: 'tests',
      metadata: {
        testRun: 'true',
        timestamp: Date.now().toString(),
      },
    });

    testFileKey = result.key;

    expect(result.key).toMatch(/^tests\/[a-f0-9-]+\.txt$/);
    expect(result.size).toBe(file.length);
    expect(result.contentType).toBe('application/octet-stream');
    expect(result.provider).toBe('r2');
    expect(result.url).toBeTruthy();

    console.log(`✅ Uploaded test file: ${result.key}`);
    console.log(`   URL: ${result.url}`);
  });

  runTest('should check if uploaded file exists', async () => {
    if (!testFileKey) {
      throw new Error('Test file key not set - upload test may have failed');
    }

    const exists = await provider.exists(testFileKey);
    expect(exists).toBe(true);

    const nonExistent = await provider.exists('tests/this-file-does-not-exist-12345.txt');
    expect(nonExistent).toBe(false);

    console.log(`✅ Exists check passed`);
  });

  runTest('should generate a signed download URL', async () => {
    if (!testFileKey) {
      throw new Error('Test file key not set - upload test may have failed');
    }

    const signedUrl = await provider.getSignedUrl(testFileKey, { expiresIn: 300 });

    expect(signedUrl).toBeTruthy();
    expect(signedUrl).toContain('X-Amz-Signature');
    expect(signedUrl).toContain('X-Amz-Expires=300');

    console.log(`✅ Generated signed URL (expires in 5 min)`);
    console.log(`   ${signedUrl.substring(0, 100)}...`);
  });

  runTest('should generate a signed upload URL', async () => {
    const uploadKey = `tests/presigned-upload-${Date.now()}.txt`;

    const signedUrl = await provider.getSignedUploadUrl(uploadKey, {
      contentType: 'text/plain',
      expiresIn: 300,
    });

    expect(signedUrl).toBeTruthy();
    expect(signedUrl).toContain('X-Amz-Signature');

    console.log(`✅ Generated signed upload URL for: ${uploadKey}`);
  });

  runTest('should delete the test file', async () => {
    if (!testFileKey) {
      throw new Error('Test file key not set - upload test may have failed');
    }

    await provider.delete(testFileKey);

    // Verify deletion
    const exists = await provider.exists(testFileKey);
    expect(exists).toBe(false);

    console.log(`✅ Deleted test file: ${testFileKey}`);

    // Clear key so afterAll doesn't try to delete again
    testFileKey = '';
  });
});

describe('Local Storage Integration Tests', () => {
  const runTest = itif(SHOULD_RUN);

  let provider: any;
  let testFileKey: string;
  const testDir = './test-uploads-integration';

  beforeAll(async () => {
    if (!SHOULD_RUN) return;

    // Mock config for local storage
    process.env.STORAGE_LOCAL_PATH = testDir;

    const { LocalStorageProvider } = await import('./local.storage.js');
    provider = new LocalStorageProvider();
  });

  afterAll(async () => {
    if (!SHOULD_RUN) return;

    // Cleanup test directory
    const fs = await import('fs/promises');
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log(`🧹 Cleaned up test directory: ${testDir}`);
    } catch {
      // Ignore
    }
  });

  runTest('should upload a file locally', async () => {
    const testContent = `Local test file created at ${new Date().toISOString()}`;
    const file = Buffer.from(testContent);

    const result = await provider.upload(file, 'local-test.txt', {
      folder: 'tests',
    });

    testFileKey = result.key;

    expect(result.key).toMatch(/^tests\/[a-f0-9-]+\.txt$/);
    expect(result.provider).toBe('local');
    expect(result.url).toContain('/uploads/');

    console.log(`✅ Uploaded local test file: ${result.key}`);
  });

  runTest('should verify local file exists', async () => {
    if (!testFileKey) throw new Error('No test file key');

    const exists = await provider.exists(testFileKey);
    expect(exists).toBe(true);

    console.log(`✅ Local file exists check passed`);
  });

  runTest('should delete local file', async () => {
    if (!testFileKey) throw new Error('No test file key');

    await provider.delete(testFileKey);

    const exists = await provider.exists(testFileKey);
    expect(exists).toBe(false);

    console.log(`✅ Deleted local test file`);
  });
});

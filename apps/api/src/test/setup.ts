/**
 * Vitest Global Setup
 *
 * This file is loaded before all tests. It sets up global mocks
 * to avoid needing a real database connection.
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { vi, beforeEach } from 'vitest';

// Load .env from monorepo root for integration tests
dotenvConfig({ path: resolve(__dirname, '../../../../.env') });
import { emailServiceMock } from './mocks/email.mock.js';

// =============================================================================
// Global Mock: Email Service
// =============================================================================

vi.mock('../services/email/index.js', () => ({
  emailService: emailServiceMock,
}));

// =============================================================================
// Global Mock: Logger (suppress logs during tests)
// =============================================================================

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

// =============================================================================
// Global Mock: Config
// =============================================================================

vi.mock('../config/index.js', () => ({
  config: {
    env: 'test',
    port: 3000,
    frontendUrl: 'http://localhost:5173',
    jwtSecret: 'test-jwt-secret',
    jwtExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
    corsOrigins: ['http://localhost:5173'],
    email: {
      provider: 'console',
      from: 'test@example.com',
      fromName: 'Test LMS',
      postmarkApiKey: '',
      sendgridApiKey: '',
    },
    redis: {
      url: 'redis://localhost:6379',
    },
    database: {
      url: 'postgres://test:test@localhost:5432/test',
    },
    // Cloudflare & Storage - use real env vars for integration tests
    cloudflare: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
      apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
    },
    storage: {
      provider: process.env.STORAGE_PROVIDER || 'local',
      localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
      r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      r2BucketName: process.env.R2_BUCKET_NAME || '',
      r2PublicUrl: process.env.R2_PUBLIC_URL || '',
    },
  },
}));

// =============================================================================
// Reset Mocks Between Tests
// =============================================================================

beforeEach(() => {
  emailServiceMock._reset();
});

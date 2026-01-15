/**
 * Vitest Global Setup
 *
 * This file is loaded before all tests. It sets up global mocks
 * to avoid needing a real database connection.
 */

import { vi, beforeEach } from 'vitest';
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
  },
}));

// =============================================================================
// Reset Mocks Between Tests
// =============================================================================

beforeEach(() => {
  emailServiceMock._reset();
});

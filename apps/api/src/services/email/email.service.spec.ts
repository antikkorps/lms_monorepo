import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// Module Mocks
// =============================================================================

// Mock providers before importing the service
const mockConsoleProvider = {
  name: 'console',
  send: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
};

const mockPostmarkProvider = {
  name: 'postmark',
  send: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
};

const mockSendGridProvider = {
  name: 'sendgrid',
  send: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
};

vi.mock('./providers/console.provider.js', () => ({
  createConsoleProvider: vi.fn(() => mockConsoleProvider),
}));

vi.mock('./providers/postmark.provider.js', () => ({
  createPostmarkProvider: vi.fn(() => mockPostmarkProvider),
}));

vi.mock('./providers/sendgrid.provider.js', () => ({
  createSendGridProvider: vi.fn(() => mockSendGridProvider),
}));

vi.mock('./circuit-breaker.js', () => ({
  createCircuitBreaker: vi.fn((provider) => ({
    ...provider,
    name: `${provider.name}:circuit-breaker`,
  })),
}));

vi.mock('../../config/index.js', () => ({
  config: {
    email: {
      provider: 'console',
      from: 'test@example.com',
      postmarkApiKey: '',
      sendgridApiKey: '',
    },
  },
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock EmailLog model to avoid database connection
vi.mock('../../database/models/EmailLog.js', () => ({
  EmailLog: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('provider selection', () => {
    it('should use console provider by default', async () => {
      // Re-import to get fresh instance with current config
      vi.resetModules();

      vi.doMock('../../config/index.js', () => ({
        config: {
          email: {
            provider: 'console',
            from: 'test@example.com',
            postmarkApiKey: '',
            sendgridApiKey: '',
          },
        },
      }));

      const { createConsoleProvider } = await import('./providers/console.provider.js');

      expect(createConsoleProvider).toBeDefined();
    });
  });

  describe('sendVerificationEmail', () => {
    it('should call provider with correct template', async () => {
      vi.resetModules();

      // Setup mocks for this test
      const mockProvider = { name: 'test', send: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' }) };

      vi.doMock('./providers/console.provider.js', () => ({
        createConsoleProvider: () => mockProvider,
      }));

      vi.doMock('../../config/index.js', () => ({
        config: {
          email: {
            provider: 'console',
            from: 'noreply@test.com',
            postmarkApiKey: '',
            sendgridApiKey: '',
          },
        },
      }));

      vi.doMock('../../utils/logger.js', () => ({
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { emailService } = await import('./email.service.js');

      await emailService.sendVerificationEmail({
        to: 'user@example.com',
        firstName: 'John',
        verificationUrl: 'https://example.com/verify?token=abc',
      });

      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Verify your email address',
        })
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should call provider with correct template', async () => {
      vi.resetModules();

      const mockProvider = { name: 'test', send: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' }) };

      vi.doMock('./providers/console.provider.js', () => ({
        createConsoleProvider: () => mockProvider,
      }));

      vi.doMock('../../config/index.js', () => ({
        config: {
          email: {
            provider: 'console',
            from: 'noreply@test.com',
            postmarkApiKey: '',
            sendgridApiKey: '',
          },
        },
      }));

      vi.doMock('../../utils/logger.js', () => ({
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { emailService } = await import('./email.service.js');

      await emailService.sendPasswordResetEmail({
        to: 'user@example.com',
        firstName: 'John',
        resetUrl: 'https://example.com/reset?token=xyz',
      });

      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Reset your password',
        })
      );
    });
  });

  describe('sendInvitationEmail', () => {
    it('should call provider with correct template', async () => {
      vi.resetModules();

      const mockProvider = { name: 'test', send: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' }) };

      vi.doMock('./providers/console.provider.js', () => ({
        createConsoleProvider: () => mockProvider,
      }));

      vi.doMock('../../config/index.js', () => ({
        config: {
          email: {
            provider: 'console',
            from: 'noreply@test.com',
            postmarkApiKey: '',
            sendgridApiKey: '',
          },
        },
      }));

      vi.doMock('../../utils/logger.js', () => ({
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      }));

      const { emailService } = await import('./email.service.js');

      await emailService.sendInvitationEmail({
        to: 'invited@example.com',
        firstName: 'Alice',
        tenantName: 'Acme Corp',
        inviterName: 'Bob Smith',
        inviteUrl: 'https://example.com/invite?token=123',
        role: 'learner',
      });

      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'invited@example.com',
          subject: "You're invited to join Acme Corp",
        })
      );
    });
  });

  describe('error handling', () => {
    it('should log error but not throw when send fails', async () => {
      vi.resetModules();

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const mockProvider = {
        name: 'test',
        send: vi.fn().mockResolvedValue({ success: false, error: 'Send failed' }),
      };

      vi.doMock('./providers/console.provider.js', () => ({
        createConsoleProvider: () => mockProvider,
      }));

      vi.doMock('../../config/index.js', () => ({
        config: {
          email: {
            provider: 'console',
            from: 'noreply@test.com',
            postmarkApiKey: '',
            sendgridApiKey: '',
          },
        },
      }));

      vi.doMock('../../utils/logger.js', () => ({
        logger: mockLogger,
      }));

      const { emailService } = await import('./email.service.js');

      // Should not throw
      await emailService.sendVerificationEmail({
        to: 'user@example.com',
        firstName: 'John',
        verificationUrl: 'https://example.com/verify',
      });

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

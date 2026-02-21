import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';

// =============================================================================
// Module Mocks
// =============================================================================

const mockMailjetPost = vi.fn();
const mockMailjetRequest = vi.fn();
const mockMailjetId = vi.fn();
const mockMailjetAction = vi.fn();

// Chain: client.post().request() and client.post().id().action().request()
mockMailjetPost.mockReturnValue({
  request: mockMailjetRequest,
  id: mockMailjetId,
});
mockMailjetId.mockReturnValue({
  action: mockMailjetAction,
});
mockMailjetAction.mockReturnValue({
  request: mockMailjetRequest,
});

class MockMailjet {
  post = mockMailjetPost;
}

vi.mock('node-mailjet', () => ({
  default: MockMailjet,
}));

vi.mock('../config/index.js', () => ({
  config: {
    email: {
      mailjetApiKey: 'test-api-key',
      mailjetApiSecret: 'test-api-secret',
      mailjetContactListId: '12345',
    },
  },
}));

vi.mock('../utils/app-error.js', () => ({
  AppError: {
    internal: (msg: string) => ({ status: 500, message: msg }),
    badRequest: (msg: string) => ({ status: 400, message: msg }),
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// =============================================================================
// Tests
// =============================================================================

function createMockContext(body: Record<string, unknown> = {}): Context {
  return {
    request: { body },
    body: undefined,
    status: 200,
  } as unknown as Context;
}

describe('NewsletterController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMailjetRequest.mockResolvedValue({});
  });

  describe('subscribe', () => {
    it('should subscribe a valid email', async () => {
      const ctx = createMockContext({ email: 'user@test.com' });

      const { subscribe } = await import('./controller.js');
      await subscribe(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({
        success: true,
        data: { subscribed: true },
      });
      expect(mockMailjetPost).toHaveBeenCalledWith('contact', { version: 'v3' });
    });

    it('should subscribe with firstName', async () => {
      const ctx = createMockContext({ email: 'user@test.com', firstName: 'John' });

      const { subscribe } = await import('./controller.js');
      await subscribe(ctx);

      expect(mockMailjetRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          Email: 'user@test.com',
          Name: 'John',
        })
      );
    });

    it('should add contact to list when configured', async () => {
      const ctx = createMockContext({ email: 'user@test.com' });

      const { subscribe } = await import('./controller.js');
      await subscribe(ctx);

      expect(mockMailjetPost).toHaveBeenCalledWith('contactslist', { version: 'v3' });
      expect(mockMailjetId).toHaveBeenCalledWith(12345);
      expect(mockMailjetAction).toHaveBeenCalledWith('managecontact');
    });

    it('should treat 400 (contact exists) as success', async () => {
      mockMailjetRequest.mockRejectedValueOnce({ statusCode: 400 });

      const ctx = createMockContext({ email: 'existing@test.com' });

      const { subscribe } = await import('./controller.js');
      await subscribe(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({
        success: true,
        data: { subscribed: true },
      });
    });

    it('should throw on Mailjet server error', async () => {
      mockMailjetRequest.mockRejectedValueOnce({ statusCode: 500 });

      const ctx = createMockContext({ email: 'user@test.com' });

      const { subscribe } = await import('./controller.js');

      await expect(subscribe(ctx)).rejects.toEqual({
        status: 500,
        message: 'Failed to subscribe to newsletter',
      });
    });

    it('should throw on invalid email', async () => {
      const ctx = createMockContext({ email: 'not-an-email' });

      const { subscribe } = await import('./controller.js');

      await expect(subscribe(ctx)).rejects.toThrow();
    });

    it('should throw when Mailjet is not configured', async () => {
      // Re-mock config with empty keys
      vi.doMock('../config/index.js', () => ({
        config: {
          email: {
            mailjetApiKey: '',
            mailjetApiSecret: '',
            mailjetContactListId: '',
          },
        },
      }));

      vi.resetModules();
      const { subscribe } = await import('./controller.js');

      const ctx = createMockContext({ email: 'user@test.com' });

      await expect(subscribe(ctx)).rejects.toEqual({
        status: 500,
        message: 'Newsletter service not configured',
      });

      // Restore original mock
      vi.doMock('../config/index.js', () => ({
        config: {
          email: {
            mailjetApiKey: 'test-api-key',
            mailjetApiSecret: 'test-api-secret',
            mailjetContactListId: '12345',
          },
        },
      }));
    });
  });
});

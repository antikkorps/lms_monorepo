import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context, Next } from 'koa';
import { z } from 'zod';
import { validate, validateQuery, validateParams } from './validate.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockContext(options: {
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
} = {}): Context {
  return {
    request: {
      body: options.body || {},
    },
    query: options.query || {},
    params: options.params || {},
  } as unknown as Context;
}

function createMockNext(): Next {
  return vi.fn().mockResolvedValue(undefined);
}

// =============================================================================
// Test Suite
// =============================================================================

describe('Validation Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // validate (body)
  // ===========================================================================

  describe('validate (body)', () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().int().positive().optional(),
    });

    it('should pass valid body through', async () => {
      const ctx = createMockContext({
        body: { name: 'John', email: 'john@example.com' },
      });
      const next = createMockNext();

      await validate(schema)(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.request.body).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should parse and transform body', async () => {
      const ctx = createMockContext({
        body: { name: 'John', email: 'john@example.com', age: 25 },
      });
      const next = createMockNext();

      await validate(schema)(ctx, next);

      expect(ctx.request.body).toEqual({ name: 'John', email: 'john@example.com', age: 25 });
    });

    it('should throw error for invalid body', async () => {
      const ctx = createMockContext({
        body: { name: '', email: 'invalid-email' },
      });
      const next = createMockNext();

      await expect(validate(schema)(ctx, next)).rejects.toThrow('Validation error');
      expect(next).not.toHaveBeenCalled();
    });

    it('should include field path in error message', async () => {
      const ctx = createMockContext({
        body: { name: 'John', email: 'invalid' },
      });
      const next = createMockNext();

      await expect(validate(schema)(ctx, next)).rejects.toThrow('email');
    });

    it('should list multiple validation errors', async () => {
      const ctx = createMockContext({
        body: { name: '', email: 'invalid' },
      });
      const next = createMockNext();

      try {
        await validate(schema)(ctx, next);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('name');
        expect((error as Error).message).toContain('email');
      }
    });
  });

  // ===========================================================================
  // validateQuery
  // ===========================================================================

  describe('validateQuery', () => {
    const schema = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
      search: z.string().optional(),
    });

    it('should pass valid query through', async () => {
      const ctx = createMockContext({
        query: { page: '2', limit: '10' },
      });
      const next = createMockNext();

      await validateQuery(schema)(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.query).toEqual({ page: 2, limit: 10 });
    });

    it('should apply defaults', async () => {
      const ctx = createMockContext({
        query: {},
      });
      const next = createMockNext();

      await validateQuery(schema)(ctx, next);

      expect(ctx.query).toEqual({ page: 1, limit: 20 });
    });

    it('should throw error for invalid query', async () => {
      const ctx = createMockContext({
        query: { page: '-1', limit: '200' },
      });
      const next = createMockNext();

      await expect(validateQuery(schema)(ctx, next)).rejects.toThrow('Validation error');
    });
  });

  // ===========================================================================
  // validateParams
  // ===========================================================================

  describe('validateParams', () => {
    const schema = z.object({
      id: z.string().uuid(),
      courseId: z.string().uuid().optional(),
    });

    it('should pass valid params through', async () => {
      const ctx = createMockContext({
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      });
      const next = createMockNext();

      await validateParams(schema)(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw error for invalid UUID', async () => {
      const ctx = createMockContext({
        params: { id: 'not-a-uuid' },
      });
      const next = createMockNext();

      await expect(validateParams(schema)(ctx, next)).rejects.toThrow('Validation error');
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Edge cases
  // ===========================================================================

  describe('Edge cases', () => {
    it('should re-throw non-Zod errors', async () => {
      const schema = {
        parse: () => {
          throw new Error('Custom error');
        },
      };

      const ctx = createMockContext({ body: {} });
      const next = createMockNext();

      await expect(validate(schema as z.ZodSchema)(ctx, next)).rejects.toThrow('Custom error');
    });
  });
});

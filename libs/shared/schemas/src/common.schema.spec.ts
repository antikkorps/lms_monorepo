import { describe, it, expect } from 'vitest';
import { paginationSchema, idParamSchema, apiErrorSchema } from './common.schema';

describe('Common Schemas', () => {
  describe('paginationSchema', () => {
    it('should validate valid pagination', () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 20 });
      expect(result.success).toBe(true);
    });

    it('should use defaults', () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should reject invalid page', () => {
      const result = paginationSchema.safeParse({ page: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe('idParamSchema', () => {
    it('should validate valid UUID', () => {
      const result = idParamSchema.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = idParamSchema.safeParse({ id: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('apiErrorSchema', () => {
    it('should validate error response', () => {
      const result = apiErrorSchema.safeParse({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
        },
      });
      expect(result.success).toBe(true);
    });
  });
});

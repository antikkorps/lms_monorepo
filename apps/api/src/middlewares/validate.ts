import type { Context, Next } from 'koa';
import type { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/app-error.js';

/**
 * Validate request body against a Zod schema
 */
export function validate<T>(schema: ZodSchema<T>) {
  return async (ctx: Context, next: Next): Promise<void> => {
    try {
      const parsed = schema.parse(ctx.request.body);
      ctx.request.body = parsed;
      await next();
    } catch (error) {
      if ((error as ZodError).issues) {
        const zodError = error as ZodError;
        const message = zodError.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        throw AppError.badRequest(`Validation error: ${message}`);
      }
      throw error;
    }
  };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (ctx: Context, next: Next): Promise<void> => {
    try {
      const parsed = schema.parse(ctx.query);
      ctx.query = parsed as typeof ctx.query;
      await next();
    } catch (error) {
      if ((error as ZodError).issues) {
        const zodError = error as ZodError;
        const message = zodError.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        throw AppError.badRequest(`Validation error: ${message}`);
      }
      throw error;
    }
  };
}

/**
 * Validate URL parameters against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return async (ctx: Context, next: Next): Promise<void> => {
    try {
      const parsed = schema.parse(ctx.params);
      ctx.params = parsed as typeof ctx.params;
      await next();
    } catch (error) {
      if ((error as ZodError).issues) {
        const zodError = error as ZodError;
        const message = zodError.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        throw AppError.badRequest(`Validation error: ${message}`);
      }
      throw error;
    }
  };
}

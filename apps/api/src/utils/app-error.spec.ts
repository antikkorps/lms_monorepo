import { describe, it, expect } from 'vitest';
import { AppError } from './app-error.js';

describe('AppError', () => {
  it('should create an error with message and statusCode', () => {
    const error = new AppError('Test error', 400, 'VALIDATION_ERROR');

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.name).toBe('AppError');
  });

  it('should include details when provided', () => {
    const details = { field: 'email', reason: 'invalid' };
    const error = new AppError('Validation failed', 422, 'VALIDATION_ERROR', details);

    expect(error.details).toEqual(details);
  });

  it('should be an instance of Error', () => {
    const error = new AppError('Test', 500, 'INTERNAL_SERVER_ERROR');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('should have static factory methods', () => {
    const badRequest = AppError.badRequest('Bad request');
    const unauthorized = AppError.unauthorized();
    const notFound = AppError.notFound();

    expect(badRequest.statusCode).toBe(400);
    expect(unauthorized.statusCode).toBe(401);
    expect(notFound.statusCode).toBe(404);
  });
});

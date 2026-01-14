export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'BAD_REQUEST';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Access denied'): AppError {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(message, 409, 'CONFLICT', details);
  }

  static validationError(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(message, 422, 'VALIDATION_ERROR', details);
  }

  static rateLimitExceeded(message = 'Rate limit exceeded'): AppError {
    return new AppError(message, 429, 'RATE_LIMIT_EXCEEDED');
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, 500, 'INTERNAL_SERVER_ERROR');
  }

  static serviceUnavailable(message = 'Service temporarily unavailable'): AppError {
    return new AppError(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

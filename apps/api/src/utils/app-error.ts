// Common error codes - extensible with string type
export type ErrorCode =
  // General
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  // Auth
  | 'AUTH_REQUIRED'
  | 'AUTH_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'TOKEN_REVOKED'
  | 'TOKEN_REUSE'
  | 'REFRESH_TOKEN_REQUIRED'
  | 'REFRESH_TOKEN_EXPIRED'
  | 'INVALID_REFRESH_TOKEN'
  | 'INVALID_CREDENTIALS'
  | 'WEAK_PASSWORD'
  | 'INVALID_PASSWORD'
  | 'ACCOUNT_INACTIVE'
  | 'USER_NOT_FOUND'
  | 'USER_INVALID'
  | 'USER_INACTIVE'
  | 'EMAIL_EXISTS'
  // Tenant
  | 'TENANT_REQUIRED'
  | 'INVALID_TENANT'
  | 'NO_SEATS_AVAILABLE'
  // RBAC
  | 'SUPER_ADMIN_REQUIRED'
  // Rate limiting
  | 'RATE_LIMIT_EXCEEDED'
  // Invitation
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_EXISTS'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_INVALID'
  | 'GROUPS_REQUIRED'
  | 'INVALID_GROUPS'
  | 'INVALID_TOKEN'
  // Discussion
  | 'DISCUSSION_NOT_FOUND'
  | 'DISCUSSION_DELETED'
  | 'DISCUSSIONS_DISABLED'
  | 'ALREADY_REPORTED'
  | 'CANNOT_REPORT_OWN'
  | 'REPLY_NOT_FOUND'
  | 'REPLY_DELETED'
  // Note
  | 'NOTE_NOT_FOUND'
  // Allow any string for extensibility
  | (string & {});

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
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

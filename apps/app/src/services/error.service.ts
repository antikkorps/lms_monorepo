/**
 * Error Service
 * Centralized error handling, logging, and reporting
 */

import { ref, readonly } from 'vue';

export interface ErrorContext {
  componentName?: string;
  info?: string;
  type?: 'vue' | 'api' | 'global' | 'unhandledrejection';
  filename?: string;
  lineno?: number;
  colno?: number;
  userId?: string;
  route?: string;
  [key: string]: unknown;
}

export interface CapturedError {
  id: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: Date;
}

const MAX_ERRORS = 50;
const errors = ref<CapturedError[]>([]);
const lastError = ref<CapturedError | null>(null);

/**
 * Generate unique error ID
 */
function generateId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Capture and log an error
 */
function captureError(error: Error, context: ErrorContext = {}): CapturedError {
  const captured: CapturedError = {
    id: generateId(),
    message: error.message || 'Unknown error',
    stack: error.stack,
    context: {
      ...context,
      route: window.location.pathname,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date(),
  };

  // Add to error list (keep last N errors)
  errors.value = [captured, ...errors.value].slice(0, MAX_ERRORS);
  lastError.value = captured;

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error(`[ErrorService] ${captured.context.type || 'error'}:`, captured.message);
    console.error('[ErrorService] Context:', captured.context);
    if (captured.stack) {
      console.error('[ErrorService] Stack:', captured.stack);
    }
  } else {
    // In production, log minimal info
    console.error(`[Error] ${captured.message}`);
  }

  // Here you could send to an error tracking service like Sentry
  // sendToErrorTracker(captured);

  return captured;
}

/**
 * Capture API errors with additional context
 */
function captureApiError(
  error: Error,
  endpoint: string,
  method: string,
  status?: number
): CapturedError {
  return captureError(error, {
    type: 'api',
    endpoint,
    method,
    status,
  });
}

/**
 * Clear all captured errors
 */
function clearErrors(): void {
  errors.value = [];
  lastError.value = null;
}

/**
 * Clear a specific error by ID
 */
function dismissError(errorId: string): void {
  errors.value = errors.value.filter((e) => e.id !== errorId);
  if (lastError.value?.id === errorId) {
    lastError.value = errors.value[0] || null;
  }
}

/**
 * Get user-friendly error message
 */
function getUserMessage(error: Error | CapturedError): string {
  const message = 'message' in error ? error.message : String(error);

  // Map common errors to user-friendly messages
  const errorMappings: Record<string, string> = {
    'Failed to fetch': 'Unable to connect to the server. Please check your internet connection.',
    'Network Error': 'Network error. Please check your internet connection.',
    'Request timeout': 'The request took too long. Please try again.',
    '401': 'Your session has expired. Please log in again.',
    '403': 'You do not have permission to perform this action.',
    '404': 'The requested resource was not found.',
    '500': 'An internal server error occurred. Please try again later.',
    '502': 'The server is temporarily unavailable. Please try again later.',
    '503': 'The service is temporarily unavailable. Please try again later.',
  };

  for (const [key, friendlyMessage] of Object.entries(errorMappings)) {
    if (message.includes(key)) {
      return friendlyMessage;
    }
  }

  return message;
}

/**
 * Check if error is a network error
 */
function isNetworkError(error: Error): boolean {
  return (
    error.message.includes('Failed to fetch') ||
    error.message.includes('Network Error') ||
    error.message.includes('net::ERR_')
  );
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error, status?: number): boolean {
  if (isNetworkError(error)) return true;
  if (status && [408, 429, 500, 502, 503, 504].includes(status)) return true;
  return false;
}

export const errorService = {
  // State (readonly)
  errors: readonly(errors),
  lastError: readonly(lastError),

  // Methods
  captureError,
  captureApiError,
  clearErrors,
  dismissError,
  getUserMessage,
  isNetworkError,
  isRetryableError,
};

export type ErrorService = typeof errorService;

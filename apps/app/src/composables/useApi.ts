/**
 * API Client Composable
 * Handles HTTP requests with automatic token refresh
 */

import type { ApiResponse, ApiError, HttpMethod } from '@shared/types';

const API_BASE = '/api/v1';

interface RetryConfig {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Base delay in ms (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in ms (default: 10000) */
  maxDelay?: number;
  /** Retry on these status codes (default: [408, 429, 500, 502, 503, 504]) */
  retryStatusCodes?: number[];
}

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  /** Retry configuration. Set to false to disable retries. */
  retry?: RetryConfig | false;
  _isRetry?: boolean; // Internal flag to prevent infinite retry loops
  _retryCount?: number; // Internal retry counter
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
};

class ApiClient {
  private isRefreshing = false;
  private refreshQueue: Array<() => void> = [];

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number, config: Required<RetryConfig>): number {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    // Clamp to maxDelay
    return Math.min(exponentialDelay + jitter, config.maxDelay);
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(
    error: unknown,
    status: number | null,
    retryCount: number,
    config: Required<RetryConfig>
  ): boolean {
    if (retryCount >= config.maxRetries) return false;

    // Network errors (fetch throws)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    // Retry on specific status codes
    if (status && config.retryStatusCodes.includes(status)) {
      return true;
    }

    return false;
  }

  /**
   * Make an API request
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params, headers = {}, skipAuth = false } = options;
    const retryCount = options._retryCount || 0;
    const retryConfig = options.retry === false
      ? null
      : { ...DEFAULT_RETRY_CONFIG, ...options.retry };

    // Build URL with query params
    const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Build request headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    let response: Response;

    try {
      // Make the request
      response = await fetch(url.toString(), {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include', // Include cookies for auth
      });
    } catch (fetchError) {
      // Network error - check if we should retry
      if (retryConfig && this.shouldRetry(fetchError, null, retryCount, retryConfig)) {
        const delay = this.calculateRetryDelay(retryCount, retryConfig);
        console.log(`[ApiClient] Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${retryConfig.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request<T>(endpoint, { ...options, _retryCount: retryCount + 1 });
      }
      throw fetchError;
    }

    // Handle 401 - attempt token refresh (only once to prevent infinite loops)
    if (response.status === 401 && !skipAuth && !options._isRetry) {
      console.log('[ApiClient] Got 401, attempting token refresh...');
      const refreshed = await this.handleTokenRefresh();
      if (refreshed) {
        console.log('[ApiClient] Token refreshed, retrying request...');
        // Retry the original request with _isRetry flag to prevent infinite loop
        return this.request<T>(endpoint, { ...options, _isRetry: true });
      }
      console.log('[ApiClient] Token refresh failed');
      // Refresh failed - let the error propagate
    }

    // Check if we should retry on server errors (5xx)
    if (retryConfig && this.shouldRetry(null, response.status, retryCount, retryConfig)) {
      const delay = this.calculateRetryDelay(retryCount, retryConfig);
      console.log(`[ApiClient] Server error ${response.status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${retryConfig.maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.request<T>(endpoint, { ...options, _retryCount: retryCount + 1 });
    }

    // Handle 204 No Content responses (e.g., DELETE operations)
    if (response.status === 204) {
      return undefined as T;
    }

    // Parse response
    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;
      throw new ApiRequestError(
        error.error?.message || 'Request failed',
        error.error?.code || 'UNKNOWN_ERROR',
        response.status,
        error.error?.details
      );
    }

    return (data as ApiResponse<T>).data;
  }

  /**
   * Handle token refresh with queue to prevent multiple refresh requests
   */
  private async handleTokenRefresh(): Promise<boolean> {
    if (this.isRefreshing) {
      // Wait for the ongoing refresh to complete
      return new Promise((resolve) => {
        this.refreshQueue.push(() => resolve(true));
      });
    }

    this.isRefreshing = true;

    try {
      console.log('[ApiClient] Calling /auth/refresh...');
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      console.log('[ApiClient] Refresh response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[ApiClient] Refresh successful, got new token');

        // Refresh successful - process queued requests
        this.refreshQueue.forEach((callback) => callback());
        this.refreshQueue = [];

        // Small delay to ensure cookies are set before retry
        await new Promise(resolve => setTimeout(resolve, 50));

        return true;
      }

      // Log the error response
      try {
        const errorData = await response.json();
        console.error('[ApiClient] Refresh failed:', errorData);
      } catch {
        console.error('[ApiClient] Refresh failed with status:', response.status);
      }

      // Refresh failed - clear auth state
      this.clearAuthState();
      return false;
    } catch (err) {
      console.error('[ApiClient] Refresh error:', err);
      this.clearAuthState();
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Clear auth state and redirect to login
   */
  private clearAuthState(): void {
    // Clear any client-side state
    localStorage.removeItem('user');

    // Clear the auth store window state to ensure router guard sees user as logged out
    const AUTH_WINDOW_KEY = '__authStoreState__';
    const windowState = (window as unknown as Record<string, unknown>)[AUTH_WINDOW_KEY];
    if (windowState) {
      (windowState as Record<string, unknown>).initialized = false;
      (windowState as Record<string, unknown>).userData = null;
      (windowState as Record<string, unknown>).initPromise = null;
    }

    // Redirect to login if not already there
    if (!window.location.pathname.includes('/login')) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
  }

  // Convenience methods
  get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

/**
 * Custom error class for API requests
 */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

// Singleton instance
const apiClient = new ApiClient();

/**
 * Composable for API requests
 */
export function useApi() {
  return apiClient;
}

export { apiClient };

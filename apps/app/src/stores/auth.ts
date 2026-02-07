/**
 * Auth Store
 * Manages authentication state with Pinia
 */

import type { AuthenticatedUser, Role } from '@shared/types';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { apiClient, ApiRequestError } from '../composables/useApi';
import { logger } from '../lib/logger';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Use window to persist state across HMR reloads
const AUTH_WINDOW_KEY = '__authStoreState__';
const INIT_THROTTLE_MS = 2000;

interface AuthWindowState {
  initialized: boolean;
  initPromise: Promise<void> | null;
  lastInitTime: number;
  userData: AuthenticatedUser | null;
}

function getAuthWindowState(): AuthWindowState {
  if (!(window as unknown as Record<string, unknown>)[AUTH_WINDOW_KEY]) {
    (window as unknown as Record<string, unknown>)[AUTH_WINDOW_KEY] = {
      initialized: false,
      initPromise: null,
      lastInitTime: 0,
      userData: null,
    };
  }
  return (window as unknown as Record<string, unknown>)[AUTH_WINDOW_KEY] as AuthWindowState;
}

export const useAuthStore = defineStore('auth', () => {
  // State - restore from window if available (survives HMR)
  const windowState = getAuthWindowState();
  const user = ref<AuthenticatedUser | null>(windowState.userData);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isInitialized = ref(windowState.initialized);

  // Getters
  const isAuthenticated = computed(() => !!user.value);
  const userRole = computed(() => user.value?.role);
  const fullName = computed(() => {
    if (!user.value) return '';
    return `${user.value.firstName} ${user.value.lastName}`.trim();
  });

  // Check if user has specific role
  const hasRole = (role: Role) => user.value?.role === role;

  // Check if user has one of multiple roles
  const hasAnyRole = (roles: Role[]) => {
    if (!user.value) return false;
    return roles.includes(user.value.role);
  };

  // Actions

  /**
   * Initialize auth state from server
   * Called on app startup
   * Uses window-level state to survive HMR and prevent race conditions
   */
  async function initialize(): Promise<void> {
    const now = Date.now();
    const windowState = getAuthWindowState();

    // Already initialized
    if (windowState.initialized || isInitialized.value) {
      isInitialized.value = true;
      return;
    }

    // Throttle: prevent rapid successive calls (e.g., during HMR)
    if (now - windowState.lastInitTime < INIT_THROTTLE_MS) {
      logger.debug('[AuthStore] Skipping init - throttled');
      isInitialized.value = true;
      return;
    }

    // Initialization already in progress - return the existing promise
    if (windowState.initPromise) {
      logger.debug('[AuthStore] Init in progress, waiting...');
      return windowState.initPromise;
    }

    windowState.lastInitTime = now;

    // Start initialization
    windowState.initPromise = (async () => {
      isLoading.value = true;
      error.value = null;

      try {
        logger.debug('[AuthStore] Initializing...');
        // Try to get current user from server (uses httpOnly cookie)
        // API returns { user: AuthenticatedUser, tenant: TenantInfo | null }
        const response = await apiClient.get<{ user: AuthenticatedUser }>('/auth/me');
        user.value = response.user;
        windowState.userData = response.user; // Persist for HMR
        logger.debug('[AuthStore] Initialized, user:', response.user?.email);
      } catch (err) {
        logger.error('[AuthStore] Init error:', err);
        // Not authenticated - that's OK
        user.value = null;
        windowState.userData = null;
      } finally {
        isLoading.value = false;
        isInitialized.value = true;
        windowState.initialized = true;
      }
    })();

    return windowState.initPromise;
  }

  /**
   * Login with email/password
   */
  async function login(credentials: LoginCredentials): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await apiClient.post<{ user: AuthenticatedUser }>(
        '/auth/login',
        credentials,
      );
      user.value = response.user;
      // Persist for HMR and mark as initialized
      const ws = getAuthWindowState();
      ws.userData = response.user;
      ws.initialized = true;
      isInitialized.value = true;
      return true;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        error.value = err.message;
      } else {
        error.value = 'An unexpected error occurred';
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Register a new account
   */
  async function register(data: RegisterData): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      await apiClient.post('/auth/register', data);
      // Registration successful - user needs to verify email
      return true;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        error.value = err.message;
      } else {
        error.value = 'An unexpected error occurred';
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Logout current user
   */
  async function logout(): Promise<void> {
    isLoading.value = true;

    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore errors - logout should always clear local state
    } finally {
      user.value = null;
      isLoading.value = false;
      // Clear window state
      const ws = getAuthWindowState();
      ws.userData = null;
      ws.initialized = false;
      isInitialized.value = false;
    }
  }

  /**
   * Logout from all devices
   */
  async function logoutAll(): Promise<void> {
    isLoading.value = true;

    try {
      await apiClient.post('/auth/logout-all');
    } catch {
      // Ignore errors
    } finally {
      user.value = null;
      isLoading.value = false;
      // Clear window state
      const ws = getAuthWindowState();
      ws.userData = null;
      ws.initialized = false;
      isInitialized.value = false;
    }
  }

  /**
   * Request password reset email
   */
  async function forgotPassword(email: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      await apiClient.post('/auth/forgot-password', { email });
      return true;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        error.value = err.message;
      } else {
        error.value = 'An unexpected error occurred';
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Reset password with token
   */
  async function resetPassword(
    token: string,
    password: string,
  ): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      await apiClient.post('/auth/reset-password', { token, password });
      return true;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        error.value = err.message;
      } else {
        error.value = 'An unexpected error occurred';
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Change password (when logged in)
   */
  async function changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return true;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        error.value = err.message;
      } else {
        error.value = 'An unexpected error occurred';
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Verify email with token
   */
  async function verifyEmail(token: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      await apiClient.post('/auth/verify-email', { token });
      return true;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        error.value = err.message;
      } else {
        error.value = 'An unexpected error occurred';
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Resend verification email
   */
  async function resendVerification(email: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      await apiClient.post('/auth/resend-verification', { email });
      return true;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        error.value = err.message;
      } else {
        error.value = 'An unexpected error occurred';
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Get SSO authorization URL
   */
  async function getSSOAuthUrl(
    provider: 'google' | 'microsoft' | 'oidc',
    tenantSlug?: string,
  ): Promise<string | null> {
    isLoading.value = true;
    error.value = null;

    try {
      const params: Record<string, string> = {
        redirect_uri: window.location.origin + '/dashboard',
      };
      if (tenantSlug) {
        params.tenant = tenantSlug;
      }

      const response = await apiClient.get<{ authUrl: string }>(
        `/auth/sso/${provider}/authorize`,
        params,
      );
      return response.authUrl;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        error.value = err.message;
      } else {
        error.value = 'An unexpected error occurred';
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Get available SSO providers for a tenant
   */
  async function getTenantSSOProviders(
    tenantSlug: string,
  ): Promise<Array<{ type: string; name: string; enabled: boolean }> | null> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await apiClient.get<{
        providers: Array<{ type: string; name: string; enabled: boolean }>;
      }>('/auth/sso/providers', { tenant: tenantSlug });
      return response.providers;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        error.value = err.message;
      } else {
        error.value = 'An unexpected error occurred';
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Clear error state
   */
  function clearError() {
    error.value = null;
  }

  return {
    // State
    user,
    isLoading,
    error,
    isInitialized,

    // Getters
    isAuthenticated,
    userRole,
    fullName,

    // Methods
    hasRole,
    hasAnyRole,
    initialize,
    login,
    register,
    logout,
    logoutAll,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyEmail,
    resendVerification,
    getSSOAuthUrl,
    getTenantSSOProviders,
    clearError,
  };
});

/**
 * Auth Store
 * Manages authentication state with Pinia
 */

import type { AuthenticatedUser, Role } from '@shared/types';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { apiClient, ApiRequestError } from '../composables/useApi';

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

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<AuthenticatedUser | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isInitialized = ref(false);

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
   */
  async function initialize() {
    if (isInitialized.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      // Try to get current user from server (uses httpOnly cookie)
      const userData = await apiClient.get<AuthenticatedUser>('/auth/me');
      user.value = userData;
    } catch (err) {
      console.error('Auth initialization error:', err);
      // Not authenticated - that's OK
      user.value = null;
    } finally {
      isLoading.value = false;
      isInitialized.value = true;
    }
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
  ): Promise<string | null> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await apiClient.get<{ authUrl: string }>(
        `/auth/sso/${provider}/authorize`,
        {
          redirect_uri: window.location.origin + '/dashboard',
        },
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
    clearError,
  };
});

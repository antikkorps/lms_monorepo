/**
 * Toast notification composable
 * Wraps vue-sonner for consistent notifications across the app
 */

import { toast as sonnerToast } from 'vue-sonner';

export interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  /**
   * Show a success toast
   */
  function success(message: string, options?: ToastOptions) {
    sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action,
    });
  }

  /**
   * Show an error toast
   */
  function error(message: string, options?: ToastOptions) {
    sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 5000, // Errors stay longer
      action: options?.action,
    });
  }

  /**
   * Show a warning toast
   */
  function warning(message: string, options?: ToastOptions) {
    sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action,
    });
  }

  /**
   * Show an info toast
   */
  function info(message: string, options?: ToastOptions) {
    sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action,
    });
  }

  /**
   * Show a loading toast that can be updated
   */
  function loading(message: string) {
    return sonnerToast.loading(message);
  }

  /**
   * Show a promise-based toast
   */
  function promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    },
  ) {
    return sonnerToast.promise(promise, messages);
  }

  /**
   * Dismiss a specific toast or all toasts
   */
  function dismiss(toastId?: string | number) {
    sonnerToast.dismiss(toastId);
  }

  return {
    success,
    error,
    warning,
    info,
    loading,
    promise,
    dismiss,
  };
}

// Export individual toast functions for direct import
export const toast = {
  success: (message: string, options?: ToastOptions) => {
    sonnerToast.success(message, options);
  },
  error: (message: string, options?: ToastOptions) => {
    sonnerToast.error(message, { ...options, duration: options?.duration ?? 5000 });
  },
  warning: (message: string, options?: ToastOptions) => {
    sonnerToast.warning(message, options);
  },
  info: (message: string, options?: ToastOptions) => {
    sonnerToast.info(message, options);
  },
  loading: (message: string) => sonnerToast.loading(message),
  promise: sonnerToast.promise,
  dismiss: sonnerToast.dismiss,
};

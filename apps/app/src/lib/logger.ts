/**
 * Frontend Logger
 *
 * Thin wrapper around console.warn / console.error (the only
 * console methods allowed by our ESLint config).
 * Debug-level messages use console.warn in development and are
 * silenced in production.
 */

const isDev = import.meta.env.DEV;

/* eslint-disable no-console */
export const logger = {
  /** Debug info — only shown in development (via console.warn) */
  debug(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.warn(`[debug] ${message}`, ...args);
    }
  },

  /** Warnings — always shown */
  warn(message: string, ...args: unknown[]): void {
    console.warn(message, ...args);
  },

  /** Errors — always shown */
  error(message: string, ...args: unknown[]): void {
    console.error(message, ...args);
  },
};
/* eslint-enable no-console */

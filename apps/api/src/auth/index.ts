/**
 * Authentication Module
 *
 * Exports all auth utilities, middleware, and routes
 */

// Utilities
export * from './password.js';
export * from './jwt.js';
export * from './session.js';

// Middleware
export {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireTenant,
  requireSuperAdmin,
  loadFullUser,
} from './middleware.js';

// Routes
export { authRouter } from './routes.js';

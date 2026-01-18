/**
 * SSO Routes
 * OAuth2/OpenID Connect authentication endpoints
 */

import Router from '@koa/router';
import {
  authorize,
  callback,
  linkAccount,
  unlinkAccount,
  getProviders,
} from './controller.js';
import { authenticate } from '../auth/middleware.js';
import { authRateLimiter } from '../middlewares/index.js';

export const ssoRouter = new Router({ prefix: '/sso' });

// Public routes
// GET /auth/sso/providers - List available SSO providers
ssoRouter.get('/providers', getProviders);

// GET /auth/sso/:provider/authorize - Initiate OAuth flow
ssoRouter.get('/:provider/authorize', authRateLimiter, authorize);

// GET /auth/sso/callback - OAuth callback (handles all providers)
ssoRouter.get('/callback', authRateLimiter, callback);

// Protected routes (require authentication)
// POST /auth/sso/link - Link existing account to SSO
ssoRouter.post('/link', authenticate, linkAccount);

// DELETE /auth/sso/unlink - Unlink SSO from account
ssoRouter.delete('/unlink', authenticate, unlinkAccount);

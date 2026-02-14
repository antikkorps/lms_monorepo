import Router from '@koa/router';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  updateLocale,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from './controller.js';
import { authenticate } from './middleware.js';
import { authRateLimiter } from '../middlewares/index.js';
import { ssoRouter } from '../sso/index.js';

export const authRouter = new Router({ prefix: '/auth' });

// Public routes (with stricter rate limiting)
authRouter.post('/register', authRateLimiter, register);
authRouter.post('/login', authRateLimiter, login);
authRouter.post('/refresh', authRateLimiter, refresh);
authRouter.post('/forgot-password', authRateLimiter, forgotPassword);
authRouter.post('/reset-password', authRateLimiter, resetPassword);
authRouter.post('/verify-email', authRateLimiter, verifyEmail);
authRouter.post('/resend-verification', authRateLimiter, resendVerification);

// Protected routes (require authentication)
authRouter.post('/logout', authenticate, logout);
authRouter.post('/logout-all', authenticate, logoutAll);
authRouter.get('/me', authenticate, me);
authRouter.patch('/me/locale', authenticate, updateLocale);
authRouter.post('/change-password', authenticate, changePassword);

// Mount SSO routes under /auth/sso
authRouter.use(ssoRouter.routes());
authRouter.use(ssoRouter.allowedMethods());

import Router from '@koa/router';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
} from './controller.js';
import { authenticate } from './middleware.js';
import { authRateLimiter } from '../middlewares/index.js';

export const authRouter = new Router({ prefix: '/auth' });

// Public routes (with stricter rate limiting)
authRouter.post('/register', authRateLimiter, register);
authRouter.post('/login', authRateLimiter, login);
authRouter.post('/refresh', refresh);
authRouter.post('/forgot-password', authRateLimiter, forgotPassword);
authRouter.post('/reset-password', authRateLimiter, resetPassword);

// Protected routes (require authentication)
authRouter.post('/logout', authenticate, logout);
authRouter.post('/logout-all', authenticate, logoutAll);
authRouter.get('/me', authenticate, me);
authRouter.post('/change-password', authenticate, changePassword);

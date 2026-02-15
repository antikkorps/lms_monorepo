import Router from '@koa/router';
import { subscribe } from './controller.js';
import { authRateLimiter } from '../middlewares/index.js';

export const newsletterRouter = new Router({ prefix: '/newsletter' });

newsletterRouter.post('/subscribe', authRateLimiter, subscribe);

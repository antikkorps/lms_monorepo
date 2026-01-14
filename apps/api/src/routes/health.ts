import Router from '@koa/router';

export const healthRouter = new Router({ prefix: '/health' });

healthRouter.get('/', async (ctx) => {
  ctx.body = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  };
});

healthRouter.get('/ready', async (ctx) => {
  // Add database and Redis connectivity checks here
  const checks = {
    database: true, // TODO: implement actual check
    redis: true, // TODO: implement actual check
  };

  const isReady = Object.values(checks).every(Boolean);

  ctx.status = isReady ? 200 : 503;
  ctx.body = {
    success: isReady,
    data: {
      status: isReady ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    },
  };
});

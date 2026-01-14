import Koa from 'koa';
import { config } from './config/index.js';
import { setupMiddlewares } from './middlewares/index.js';
import { setupRoutes } from './routes/index.js';
import { logger } from './utils/logger.js';

const app = new Koa();

// Setup middlewares (error handling, logging, cors, etc.)
setupMiddlewares(app);

// Setup routes
setupRoutes(app);

const server = app.listen(config.port, () => {
  logger.info(`API server running on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close database connections
      // await sequelize.close();
      // logger.info('Database connections closed');

      // Close Redis connections
      // await redis.quit();
      // logger.info('Redis connections closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', error);
      process.exit(1);
    }
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app };

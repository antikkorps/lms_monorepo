import Koa from 'koa';
import { config } from './config/index.js';
import { setupMiddlewares } from './middlewares/index.js';
import { setupRoutes } from './routes/index.js';
import { logger } from './utils/logger.js';
import { connectRedis, disconnectRedis } from './utils/redis.js';

const app = new Koa();

// Setup middlewares (error handling, logging, cors, etc.)
setupMiddlewares(app);

// Setup routes
setupRoutes(app);

// Initialize connections and start server
async function bootstrap() {
  try {
    // Connect to Redis
    await connectRedis();
    logger.info('Redis connection established');

    // Start HTTP server
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
          await disconnectRedis();

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error({ err: error }, 'Error during graceful shutdown');
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
  } catch (error) {
    logger.error({ err: error }, 'Failed to bootstrap application');
    process.exit(1);
  }
}

bootstrap();

export { app };

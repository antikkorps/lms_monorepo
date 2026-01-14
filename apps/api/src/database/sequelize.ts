import { Sequelize } from 'sequelize';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'postgres',
  logging: (msg) => logger.debug(msg),
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    underscored: true, // Use snake_case for column names
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error({ err: error }, 'Unable to connect to the database');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error({ err: error }, 'Error closing database connection');
    throw error;
  }
}

export async function syncDatabase(force = false): Promise<void> {
  try {
    await sequelize.sync({ force });
    logger.info(`Database synchronized${force ? ' (force)' : ''}`);
  } catch (error) {
    logger.error({ err: error }, 'Error synchronizing database');
    throw error;
  }
}

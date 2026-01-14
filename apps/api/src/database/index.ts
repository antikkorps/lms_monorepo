/**
 * Database Module
 *
 * Exports all database utilities and models
 */

export * from './sequelize.js';
export * from './models/index.js';

import { connectDatabase, disconnectDatabase } from './sequelize.js';
import { setupAssociations } from './models/index.js';
import { logger } from '../utils/logger.js';

let initialized = false;

/**
 * Initialize the database connection and models
 * This should be called once during application startup
 */
export async function initializeDatabase(): Promise<void> {
  if (initialized) {
    logger.warn('Database already initialized');
    return;
  }

  // Setup model associations
  setupAssociations();
  logger.info('Database associations configured');

  // Connect to database
  await connectDatabase();

  initialized = true;
  logger.info('Database initialization complete');
}

/**
 * Shutdown the database connection gracefully
 */
export async function shutdownDatabase(): Promise<void> {
  if (!initialized) {
    return;
  }

  await disconnectDatabase();
  initialized = false;
}

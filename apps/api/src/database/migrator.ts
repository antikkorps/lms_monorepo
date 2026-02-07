/**
 * Database Migration Runner
 *
 * Tracks and applies SQL migrations from docker/postgres/migrations/.
 * Uses a `schema_migrations` table for tracking and PostgreSQL advisory locks
 * to prevent concurrent execution.
 *
 * Usage:
 *   npx tsx apps/api/src/database/migrator.ts          # apply pending migrations
 *   npx tsx apps/api/src/database/migrator.ts status    # show migration status
 */

import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sequelize, QueryTypes } from 'sequelize';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, '../../../../docker/postgres/migrations');
const ADVISORY_LOCK_ID = 839271; // arbitrary unique lock ID for migrations

interface MigrationRecord {
  filename: string;
  applied_at: Date;
}

// ─── Core functions (exported for testing) ────────────────────────────────────

export async function ensureSchemaTable(sequelize: Sequelize): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename  VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function getAppliedMigrations(sequelize: Sequelize): Promise<MigrationRecord[]> {
  return sequelize.query<MigrationRecord>(
    'SELECT filename, applied_at FROM schema_migrations ORDER BY filename',
    { type: QueryTypes.SELECT },
  );
}

export async function getMigrationFiles(dir: string): Promise<string[]> {
  const files = await readdir(dir);
  return files.filter((f) => f.endsWith('.sql')).sort();
}

export async function applyMigration(
  sequelize: Sequelize,
  dir: string,
  filename: string,
): Promise<number> {
  const sql = await readFile(resolve(dir, filename), 'utf-8');
  const start = performance.now();

  await sequelize.transaction(async (t) => {
    await sequelize.query(sql, { transaction: t });
    await sequelize.query(
      'INSERT INTO schema_migrations (filename) VALUES (:filename)',
      { replacements: { filename }, transaction: t },
    );
  });

  return Math.round(performance.now() - start);
}

// ─── Commands ─────────────────────────────────────────────────────────────────

export async function migrate(sequelize: Sequelize, dir: string): Promise<void> {
  // Acquire advisory lock to prevent concurrent migration runs
  await sequelize.query(`SELECT pg_advisory_lock(${ADVISORY_LOCK_ID})`);

  try {
    await ensureSchemaTable(sequelize);

    const applied = await getAppliedMigrations(sequelize);
    const appliedSet = new Set(applied.map((r) => r.filename));
    const allFiles = await getMigrationFiles(dir);
    const pending = allFiles.filter((f) => !appliedSet.has(f));

    if (pending.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info({ count: pending.length }, 'Pending migrations found');

    for (const filename of pending) {
      const ms = await applyMigration(sequelize, dir, filename);
      logger.info(`Applied: ${filename} (${ms}ms)`);
    }

    logger.info({ count: pending.length }, 'All migrations applied');
  } finally {
    await sequelize.query(`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
  }
}

export async function status(sequelize: Sequelize, dir: string): Promise<boolean> {
  await ensureSchemaTable(sequelize);

  const applied = await getAppliedMigrations(sequelize);
  const appliedMap = new Map(applied.map((r) => [r.filename, r.applied_at]));
  const allFiles = await getMigrationFiles(dir);

  let hasPending = false;

  logger.info('Migration                                 Status     Applied at');
  logger.info('─'.repeat(76));

  for (const filename of allFiles) {
    const appliedAt = appliedMap.get(filename);
    if (appliedAt) {
      const date = new Date(appliedAt).toISOString().replace('T', ' ').slice(0, 19);
      logger.info(`${filename.padEnd(42)}applied    ${date}`);
    } else {
      hasPending = true;
      logger.info(`${filename.padEnd(42)}pending`);
    }
  }

  if (hasPending) {
    logger.info('Run `npm run db:migrate` to apply pending migrations.');
  } else {
    logger.info('All migrations are up to date.');
  }

  return hasPending;
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const command = process.argv[2] || 'migrate';

  const sequelize = new Sequelize(config.databaseUrl, {
    dialect: 'postgres',
    logging: false,
  });

  try {
    await sequelize.authenticate();

    if (command === 'status') {
      const hasPending = await status(sequelize, MIGRATIONS_DIR);
      process.exit(hasPending ? 1 : 0);
    } else if (command === 'migrate') {
      await migrate(sequelize, MIGRATIONS_DIR);
    } else {
      logger.error(`Unknown command: ${command}`);
      logger.error('Usage: migrator.ts [migrate|status]');
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ message: error.message, stack: error.stack }, 'Migration failed');
    } else {
      logger.error({ error: String(error) }, 'Migration failed');
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Only run when executed directly (not when imported by tests)
const isDirectRun =
  process.argv[1] &&
  resolve(process.argv[1]).replace(/\.ts$/, '') ===
    fileURLToPath(import.meta.url).replace(/\.ts$/, '');

if (isDirectRun) {
  main();
}

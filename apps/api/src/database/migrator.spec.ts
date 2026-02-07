import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ensureSchemaTable,
  getAppliedMigrations,
  getMigrationFiles,
  applyMigration,
  migrate,
  status,
} from './migrator.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('../config/index.js', () => ({
  config: { databaseUrl: 'postgres://test:test@localhost:5432/test', nodeEnv: 'test' },
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { readdir, readFile } from 'node:fs/promises';

function createMockSequelize() {
  const queryFn = vi.fn().mockResolvedValue([]);
  const transactionFn = vi.fn(async (cb: (t: object) => Promise<void>) => {
    await cb({ id: 'mock-transaction' });
  });
  return {
    query: queryFn,
    transaction: transactionFn,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('migrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ensureSchemaTable', () => {
    it('should run CREATE TABLE IF NOT EXISTS', async () => {
      const seq = createMockSequelize();
      await ensureSchemaTable(seq as never);

      expect(seq.query).toHaveBeenCalledOnce();
      const sql = seq.query.mock.calls[0][0] as string;
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS schema_migrations');
    });
  });

  describe('getAppliedMigrations', () => {
    it('should query schema_migrations ordered by filename', async () => {
      const seq = createMockSequelize();
      seq.query.mockResolvedValueOnce([
        { filename: '002_foo.sql', applied_at: new Date() },
      ]);

      const result = await getAppliedMigrations(seq as never);

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('002_foo.sql');
    });
  });

  describe('getMigrationFiles', () => {
    it('should return sorted .sql files only', async () => {
      vi.mocked(readdir).mockResolvedValueOnce([
        '003_c.sql',
        '001_a.sql',
        'README.md',
        '002_b.sql',
      ] as never);

      const files = await getMigrationFiles('/fake/dir');

      expect(files).toEqual(['001_a.sql', '002_b.sql', '003_c.sql']);
    });

    it('should return empty array when no SQL files', async () => {
      vi.mocked(readdir).mockResolvedValueOnce(['README.md'] as never);

      const files = await getMigrationFiles('/fake/dir');

      expect(files).toEqual([]);
    });
  });

  describe('applyMigration', () => {
    it('should read SQL file and execute in a transaction', async () => {
      const seq = createMockSequelize();
      vi.mocked(readFile).mockResolvedValueOnce('ALTER TABLE foo ADD COLUMN bar TEXT;');

      const ms = await applyMigration(seq as never, '/fake/dir', '002_foo.sql');

      expect(readFile).toHaveBeenCalledWith('/fake/dir/002_foo.sql', 'utf-8');
      expect(seq.transaction).toHaveBeenCalledOnce();
      // Inside the transaction callback, query should be called twice: the SQL + the INSERT
      expect(seq.query).toHaveBeenCalledTimes(2);
      expect(typeof ms).toBe('number');
    });
  });

  describe('migrate', () => {
    it('should acquire advisory lock, apply pending, and release lock', async () => {
      const seq = createMockSequelize();

      // advisory lock call
      seq.query
        .mockResolvedValueOnce([]) // pg_advisory_lock
        .mockResolvedValueOnce([]) // CREATE TABLE
        .mockResolvedValueOnce([{ filename: '001_a.sql', applied_at: new Date() }]) // SELECT applied
        .mockResolvedValueOnce([]) // pg_advisory_unlock
        ;

      vi.mocked(readdir).mockResolvedValueOnce(['001_a.sql'] as never);

      await migrate(seq as never, '/fake/dir');

      // First call = advisory lock, last call = advisory unlock
      const calls = seq.query.mock.calls;
      expect((calls[0][0] as string)).toContain('pg_advisory_lock');
      expect((calls[calls.length - 1][0] as string)).toContain('pg_advisory_unlock');
    });

    it('should apply pending migrations in order', async () => {
      const seq = createMockSequelize();

      seq.query
        .mockResolvedValueOnce([]) // pg_advisory_lock
        .mockResolvedValueOnce([]) // CREATE TABLE
        .mockResolvedValueOnce([]) // SELECT applied (none)
        .mockResolvedValueOnce([]) // pg_advisory_unlock (will be called in finally)
        ;

      vi.mocked(readdir).mockResolvedValueOnce(['001_a.sql', '002_b.sql'] as never);
      vi.mocked(readFile).mockResolvedValue('SELECT 1;');

      await migrate(seq as never, '/fake/dir');

      // Should have called transaction twice (once per migration)
      expect(seq.transaction).toHaveBeenCalledTimes(2);
    });

    it('should skip when no pending migrations', async () => {
      const seq = createMockSequelize();

      seq.query
        .mockResolvedValueOnce([]) // pg_advisory_lock
        .mockResolvedValueOnce([]) // CREATE TABLE
        .mockResolvedValueOnce([{ filename: '001_a.sql', applied_at: new Date() }]) // SELECT applied
        .mockResolvedValueOnce([]) // pg_advisory_unlock
        ;

      vi.mocked(readdir).mockResolvedValueOnce(['001_a.sql'] as never);

      await migrate(seq as never, '/fake/dir');

      expect(seq.transaction).not.toHaveBeenCalled();
    });
  });

  describe('status', () => {
    it('should return false when all migrations are applied', async () => {
      const seq = createMockSequelize();

      seq.query
        .mockResolvedValueOnce([]) // CREATE TABLE
        .mockResolvedValueOnce([{ filename: '001_a.sql', applied_at: new Date() }]) // SELECT applied
        ;

      vi.mocked(readdir).mockResolvedValueOnce(['001_a.sql'] as never);

      const hasPending = await status(seq as never, '/fake/dir');

      expect(hasPending).toBe(false);
    });

    it('should return true when there are pending migrations', async () => {
      const seq = createMockSequelize();

      seq.query
        .mockResolvedValueOnce([]) // CREATE TABLE
        .mockResolvedValueOnce([]) // SELECT applied (none)
        ;

      vi.mocked(readdir).mockResolvedValueOnce(['001_a.sql'] as never);

      const hasPending = await status(seq as never, '/fake/dir');

      expect(hasPending).toBe(true);
    });
  });
});

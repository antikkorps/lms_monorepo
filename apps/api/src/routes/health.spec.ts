import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';

// =============================================================================
// Module Mocks
// =============================================================================

vi.mock('../database/sequelize.js', () => ({
  sequelize: { authenticate: vi.fn() },
}));

vi.mock('../utils/redis.js', () => ({
  getRedisClient: vi.fn(),
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Import after mocks
import { healthCheck, readinessCheck } from './health.js';
import { sequelize } from '../database/sequelize.js';
import { getRedisClient } from '../utils/redis.js';
import { beginShutdown, resetShutdownState } from '../utils/shutdown.js';

function createCtx(): Context {
  return { status: 200, body: null } as unknown as Context;
}

describe('health routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetShutdownState();
  });

  describe('healthCheck (liveness)', () => {
    it('reports healthy without touching dependencies', async () => {
      const ctx = createCtx();
      await healthCheck(ctx);

      expect((ctx.body as { success: boolean }).success).toBe(true);
      expect((ctx.body as { data: { status: string } }).data.status).toBe('healthy');
      expect(sequelize.authenticate).not.toHaveBeenCalled();
    });
  });

  describe('readinessCheck (readiness)', () => {
    it('returns 200 when database and redis are reachable', async () => {
      vi.mocked(sequelize.authenticate).mockResolvedValue(undefined as never);
      vi.mocked(getRedisClient).mockReturnValue({ ping: vi.fn().mockResolvedValue('PONG') } as never);

      const ctx = createCtx();
      await readinessCheck(ctx);

      expect(ctx.status).toBe(200);
      expect((ctx.body as { data: { status: string; checks: Record<string, boolean> } }).data).toMatchObject({
        status: 'ready',
        checks: { database: true, redis: true },
      });
    });

    it('returns 503 when the database is unreachable', async () => {
      vi.mocked(sequelize.authenticate).mockRejectedValue(new Error('db down') as never);
      vi.mocked(getRedisClient).mockReturnValue({ ping: vi.fn().mockResolvedValue('PONG') } as never);

      const ctx = createCtx();
      await readinessCheck(ctx);

      expect(ctx.status).toBe(503);
      expect((ctx.body as { data: { checks: Record<string, boolean> } }).data.checks).toMatchObject({
        database: false,
        redis: true,
      });
    });

    it('returns 503 when redis does not answer PONG', async () => {
      vi.mocked(sequelize.authenticate).mockResolvedValue(undefined as never);
      vi.mocked(getRedisClient).mockReturnValue({ ping: vi.fn().mockResolvedValue('nope') } as never);

      const ctx = createCtx();
      await readinessCheck(ctx);

      expect(ctx.status).toBe(503);
      expect((ctx.body as { success: boolean }).success).toBe(false);
    });

    it('returns 503 (shutting_down) and skips checks once shutdown has begun', async () => {
      beginShutdown();

      const ctx = createCtx();
      await readinessCheck(ctx);

      expect(ctx.status).toBe(503);
      expect((ctx.body as { data: { status: string } }).data.status).toBe('shutting_down');
      // Drain must not depend on dependency probes
      expect(sequelize.authenticate).not.toHaveBeenCalled();
      expect(getRedisClient).not.toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { getTranscodingStats, listTranscodingJobs, retryTranscodingJob } from './transcoding.controller.js';

// ── Mocks ──────────────────────────────────────────────────────────

const mockGetJobCounts = vi.fn();
const mockGetJobs = vi.fn();
const mockGetJob = vi.fn();

vi.mock('../queue/index.js', () => ({
  transcodingQueue: {
    getJobCounts: (...args: unknown[]) => mockGetJobCounts(...args),
    getJobs: (...args: unknown[]) => mockGetJobs(...args),
    getJob: (...args: unknown[]) => mockGetJob(...args),
  },
}));

const mockFindAll = vi.fn();

vi.mock('../database/models/index.js', () => ({
  LessonContent: {
    findAll: (...args: unknown[]) => mockFindAll(...args),
  },
}));

vi.mock('../database/sequelize.js', () => ({
  sequelize: {
    fn: (fn: string, col: unknown) => ({ fn, col }),
    col: (name: string) => ({ col: name }),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────

function createMockContext(options: {
  params?: Record<string, string>;
  query?: Record<string, string>;
} = {}): Context {
  return {
    params: options.params || {},
    query: options.query || {},
    request: { body: {} },
    state: {},
    status: 200,
    body: null,
  } as unknown as Context;
}

function createMockJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    name: 'submit-transcoding',
    data: { type: 'submit-transcoding', lessonContentId: 'lc-1', videoSourceKey: 'key.mp4' },
    attemptsMade: 0,
    failedReason: undefined,
    processedOn: 1700000000000,
    finishedOn: 1700000060000,
    timestamp: 1700000000000,
    opts: { delay: 0 },
    getState: vi.fn().mockResolvedValue('failed'),
    retry: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getTranscodingStats', () => {
  it('returns queue counts and DB content counts', async () => {
    const queueCounts = { active: 1, waiting: 2, delayed: 0, completed: 50, failed: 3 };
    mockGetJobCounts.mockResolvedValue(queueCounts);
    mockFindAll.mockResolvedValue([
      { transcodingStatus: 'pending', count: '5' },
      { transcodingStatus: 'ready', count: '40' },
      { transcodingStatus: 'error', count: '3' },
    ]);

    const ctx = createMockContext();
    await getTranscodingStats(ctx);

    expect(ctx.status).toBe(200);
    expect(ctx.body).toEqual({
      success: true,
      data: {
        queue: queueCounts,
        content: { pending: 5, ready: 40, error: 3 },
      },
    });
    expect(mockGetJobCounts).toHaveBeenCalledWith('active', 'waiting', 'delayed', 'completed', 'failed');
  });
});

describe('listTranscodingJobs', () => {
  it('returns serialized jobs with pagination', async () => {
    const mockJob = createMockJob();
    mockGetJobs.mockResolvedValue([mockJob]);

    const ctx = createMockContext({ query: { status: 'failed', limit: '10', offset: '0' } });
    await listTranscodingJobs(ctx);

    expect(ctx.status).toBe(200);
    const body = ctx.body as { success: boolean; data: { jobs: unknown[]; pagination: unknown } };
    expect(body.success).toBe(true);
    expect(body.data.jobs).toHaveLength(1);
    expect(body.data.jobs[0]).toEqual({
      id: 'job-1',
      name: 'submit-transcoding',
      data: mockJob.data,
      attemptsMade: 0,
      failedReason: null,
      processedOn: 1700000000000,
      finishedOn: 1700000060000,
      timestamp: 1700000000000,
      delay: 0,
    });
    expect(body.data.pagination).toEqual({ limit: 10, offset: 0 });
    expect(mockGetJobs).toHaveBeenCalledWith(['failed'], 0, 9);
  });

  it('uses default limit and offset', async () => {
    mockGetJobs.mockResolvedValue([]);

    const ctx = createMockContext({ query: { status: 'active' } });
    await listTranscodingJobs(ctx);

    expect(mockGetJobs).toHaveBeenCalledWith(['active'], 0, 19);
  });

  it('throws 400 if status is missing', async () => {
    const ctx = createMockContext({ query: {} });
    await expect(listTranscodingJobs(ctx)).rejects.toThrow('Invalid query parameters');
  });
});

describe('retryTranscodingJob', () => {
  it('retries a failed job', async () => {
    const mockJob = createMockJob();
    mockGetJob.mockResolvedValue(mockJob);

    const ctx = createMockContext({ params: { id: 'job-1' } });
    await retryTranscodingJob(ctx);

    expect(ctx.status).toBe(200);
    expect(ctx.body).toEqual({
      success: true,
      data: { id: 'job-1', message: 'Job retried' },
    });
    expect(mockJob.retry).toHaveBeenCalled();
  });

  it('throws 404 if job not found', async () => {
    mockGetJob.mockResolvedValue(null);

    const ctx = createMockContext({ params: { id: 'unknown' } });
    await expect(retryTranscodingJob(ctx)).rejects.toThrow('Job not found');
  });

  it('throws 400 if job is not in failed state', async () => {
    const mockJob = createMockJob();
    mockJob.getState.mockResolvedValue('completed');
    mockGetJob.mockResolvedValue(mockJob);

    const ctx = createMockContext({ params: { id: 'job-1' } });
    await expect(retryTranscodingJob(ctx)).rejects.toThrow('Only failed jobs can be retried');
  });
});

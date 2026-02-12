import type { Context } from 'koa';
import { z } from 'zod';
import { Op } from 'sequelize';
import { transcodingQueue } from '../queue/index.js';
import { LessonContent } from '../database/models/index.js';
import { sequelize } from '../database/sequelize.js';
import { AppError } from '../utils/app-error.js';

// Validation schemas
const listJobsSchema = z.object({
  status: z.enum(['active', 'waiting', 'delayed', 'completed', 'failed']),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

function serializeJob(job: {
  id?: string;
  name: string;
  data: unknown;
  attemptsMade: number;
  failedReason?: string;
  processedOn?: number;
  finishedOn?: number;
  timestamp?: number;
  opts?: { delay?: number };
}) {
  return {
    id: job.id,
    name: job.name,
    data: job.data,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason ?? null,
    processedOn: job.processedOn ?? null,
    finishedOn: job.finishedOn ?? null,
    timestamp: job.timestamp ?? null,
    delay: job.opts?.delay ?? null,
  };
}

/**
 * GET /admin/transcoding/stats
 * Queue job counts + DB content counts by transcodingStatus
 */
export async function getTranscodingStats(ctx: Context): Promise<void> {
  const queueCounts = await transcodingQueue.getJobCounts(
    'active',
    'waiting',
    'delayed',
    'completed',
    'failed'
  );

  const dbRows = (await LessonContent.findAll({
    attributes: [
      'transcodingStatus',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    where: { transcodingStatus: { [Op.ne]: null } },
    group: ['transcodingStatus'],
    raw: true,
  })) as unknown as { transcodingStatus: string; count: string }[];

  const contentCounts: Record<string, number> = {};
  for (const row of dbRows) {
    contentCounts[row.transcodingStatus] = parseInt(row.count, 10);
  }

  ctx.status = 200;
  ctx.body = {
    success: true,
    data: {
      queue: queueCounts,
      content: contentCounts,
    },
  };
}

/**
 * GET /admin/transcoding/jobs
 * Paginated list of jobs filtered by status
 */
export async function listTranscodingJobs(ctx: Context): Promise<void> {
  const validation = listJobsSchema.safeParse(ctx.query);
  if (!validation.success) {
    throw new AppError('Invalid query parameters', 400, 'VALIDATION_ERROR', {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const { status, limit, offset } = validation.data;
  const jobs = await transcodingQueue.getJobs([status], offset, offset + limit - 1);

  ctx.status = 200;
  ctx.body = {
    success: true,
    data: {
      jobs: jobs.map(serializeJob),
      pagination: { limit, offset },
    },
  };
}

/**
 * POST /admin/transcoding/jobs/:id/retry
 * Retry a failed job
 */
export async function retryTranscodingJob(ctx: Context): Promise<void> {
  const job = await transcodingQueue.getJob(ctx.params.id);
  if (!job) {
    throw AppError.notFound('Job not found');
  }

  const state = await job.getState();
  if (state !== 'failed') {
    throw AppError.badRequest('Only failed jobs can be retried');
  }

  await job.retry();

  ctx.status = 200;
  ctx.body = {
    success: true,
    data: { id: job.id, message: 'Job retried' },
  };
}

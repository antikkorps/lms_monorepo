import { Worker, type Job } from 'bullmq';
import { queueConnection } from '../connection.js';
import {
  LEADERBOARD_QUEUE_NAME,
  leaderboardQueue,
  type LeaderboardJobData,
} from '../leaderboard.queue.js';
import {
  LeaderboardEntry,
  UserStreak,
} from '../../database/models/index.js';
import {
  LeaderboardMetric,
  LeaderboardPeriod,
  CourseStatus,
} from '../../database/models/enums.js';
import { calculatePeriodStart } from '../../leaderboards/controller.js';
import { sequelize } from '../../database/sequelize.js';
import { Op } from 'sequelize';
import { logger } from '../../utils/logger.js';

/**
 * Compute leaderboard entries for all metrics and periods.
 */
async function processLeaderboardRefresh(job: Job<LeaderboardJobData>): Promise<void> {
  logger.info({ jobId: job.id }, 'Processing leaderboard refresh');

  const periods = Object.values(LeaderboardPeriod);
  const metrics = Object.values(LeaderboardMetric);

  for (const period of periods) {
    const periodStart = calculatePeriodStart(period);

    for (const metric of metrics) {
      try {
        await computeMetric(metric, period, periodStart);
      } catch (error) {
        logger.error(
          { metric, period, error: error instanceof Error ? error.message : 'Unknown' },
          'Failed to compute leaderboard metric'
        );
      }
    }
  }

  logger.info({ jobId: job.id }, 'Leaderboard refresh completed');
}

async function computeMetric(
  metric: LeaderboardMetric,
  period: LeaderboardPeriod,
  periodStart: string
): Promise<void> {
  let scores: { userId: string; score: number }[] = [];

  switch (metric) {
    case LeaderboardMetric.COURSES_COMPLETED:
      scores = await computeCoursesCompleted(periodStart);
      break;
    case LeaderboardMetric.AVG_QUIZ_SCORE:
      scores = await computeAvgQuizScore(periodStart);
      break;
    case LeaderboardMetric.CURRENT_STREAK:
      scores = await computeCurrentStreak();
      break;
    case LeaderboardMetric.TOTAL_LEARNING_TIME:
      scores = await computeTotalLearningTime(periodStart);
      break;
  }

  // Sort by score DESC and assign ranks
  scores.sort((a, b) => b.score - a.score);

  // Upsert entries with rank
  for (let i = 0; i < scores.length; i++) {
    const { userId, score } = scores[i];
    const rank = i + 1;

    await LeaderboardEntry.upsert({
      userId,
      tenantId: null,
      courseId: null,
      metric,
      period,
      score,
      rank,
      periodStart,
      updatedAt: new Date(),
    });
  }

  logger.debug(
    { metric, period, entriesCount: scores.length },
    'Leaderboard metric computed'
  );
}

async function computeCoursesCompleted(
  periodStart: string
): Promise<{ userId: string; score: number }[]> {
  // Count completed courses per user (where all lessons are completed)
  const results = await sequelize.query<{ userId: string; score: string }>(
    `SELECT up.user_id AS "userId", COUNT(DISTINCT up.course_id)::int AS score
     FROM user_progress up
     JOIN courses c ON c.id = up.course_id AND c.status = :courseStatus
     WHERE up.completed = true
       AND up.completed_at >= :periodStart
     GROUP BY up.user_id
     HAVING COUNT(DISTINCT up.lesson_id) > 0
     ORDER BY score DESC
     LIMIT 500`,
    {
      replacements: { periodStart, courseStatus: CourseStatus.PUBLISHED },
      type: 'SELECT' as never,
    }
  );

  return results.map((r) => ({
    userId: r.userId,
    score: Number(r.score),
  }));
}

async function computeAvgQuizScore(
  periodStart: string
): Promise<{ userId: string; score: number }[]> {
  const results = await sequelize.query<{ userId: string; score: string }>(
    `SELECT user_id AS "userId",
            ROUND(AVG(score_percentage)::numeric, 2) AS score
     FROM quiz_results
     WHERE completed_at >= :periodStart
     GROUP BY user_id
     HAVING COUNT(*) >= 1
     ORDER BY score DESC
     LIMIT 500`,
    {
      replacements: { periodStart },
      type: 'SELECT' as never,
    }
  );

  return results.map((r) => ({
    userId: r.userId,
    score: Number(r.score),
  }));
}

async function computeCurrentStreak(): Promise<{ userId: string; score: number }[]> {
  const streaks = await UserStreak.findAll({
    where: {
      currentStreak: { [Op.gt]: 0 },
    },
    attributes: ['userId', 'currentStreak'],
    order: [['currentStreak', 'DESC']],
    limit: 500,
  });

  return streaks.map((s) => ({
    userId: s.userId,
    score: s.currentStreak,
  }));
}

async function computeTotalLearningTime(
  periodStart: string
): Promise<{ userId: string; score: number }[]> {
  // Sum lesson durations for completed lessons
  const results = await sequelize.query<{ userId: string; score: string }>(
    `SELECT up.user_id AS "userId",
            COALESCE(SUM(l.duration), 0)::int AS score
     FROM user_progress up
     JOIN lessons l ON l.id = up.lesson_id
     WHERE up.completed = true
       AND up.completed_at >= :periodStart
     GROUP BY up.user_id
     ORDER BY score DESC
     LIMIT 500`,
    {
      replacements: { periodStart },
      type: 'SELECT' as never,
    }
  );

  return results.map((r) => ({
    userId: r.userId,
    score: Number(r.score),
  }));
}

let worker: Worker | null = null;

export function startLeaderboardWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker<LeaderboardJobData>(
    LEADERBOARD_QUEUE_NAME,
    processLeaderboardRefresh,
    {
      connection: queueConnection,
      concurrency: 1,
    }
  );

  worker.on('completed', (job: Job<LeaderboardJobData>) => {
    logger.debug({ jobId: job.id }, 'Leaderboard refresh job completed');
  });

  worker.on('failed', (job: Job<LeaderboardJobData> | undefined, error: Error) => {
    logger.error(
      { jobId: job?.id, error: error.message },
      'Leaderboard refresh job failed'
    );
  });

  logger.info('Leaderboard worker started');

  return worker;
}

export async function stopLeaderboardWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Leaderboard worker stopped');
  }
}

/**
 * Schedule repeatable leaderboard refresh (every 15 minutes)
 */
export async function scheduleLeaderboardRefresh(): Promise<void> {
  // Remove any existing repeatable jobs
  const repeatableJobs = await leaderboardQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await leaderboardQueue.removeRepeatableByKey(job.key);
  }

  // Add new repeatable job
  await leaderboardQueue.add(
    'refresh',
    { trigger: 'scheduled' },
    {
      repeat: {
        every: 15 * 60 * 1000, // 15 minutes
      },
    }
  );

  logger.info('Leaderboard refresh scheduled (every 15 minutes)');
}

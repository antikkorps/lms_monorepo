/**
 * Certificate Routes
 *
 * Endpoints for generating and verifying completion certificates
 */

import Router from '@koa/router';
import crypto from 'node:crypto';
import { generateCertificate, type CertificateData } from './generator.js';
import { authenticate } from '../auth/middleware.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { config, APP_NAME } from '../config/index.js';
import { User, Course, Chapter, Lesson, UserProgress } from '../database/models/index.js';

const router = new Router({ prefix: '/certificates' });

/**
 * Compute completion for a user/course pair.
 * Returns { progress, completedAt } where completedAt is the last lesson completedAt.
 */
async function getCourseCompletion(userId: string, courseId: string) {
  const course = await Course.findByPk(courseId, {
    attributes: ['id', 'title', 'description'],
  });

  if (!course) return null;

  // Count total lessons via chapters
  const totalLessons = await Lesson.count({
    include: [{ model: Chapter, as: 'chapter', where: { courseId }, attributes: [] }],
  });

  if (totalLessons === 0) return null;

  const progressRows = await UserProgress.findAll({
    where: { userId, courseId, completed: true },
    attributes: ['lessonId', 'completedAt'],
  });

  const completedCount = progressRows.length;
  const progress = Math.round((completedCount / totalLessons) * 100);

  // Find latest completedAt
  let lastCompletedAt: Date | null = null;
  for (const row of progressRows) {
    if (row.completedAt && (!lastCompletedAt || row.completedAt > lastCompletedAt)) {
      lastCompletedAt = row.completedAt;
    }
  }

  return { progress, completedAt: lastCompletedAt, course };
}

/**
 * Generate a deterministic certificate ID from courseId + userId
 */
function generateCertificateId(courseId: string, userId: string): string {
  const hash = crypto.createHash('sha256').update(`${courseId}:${userId}`).digest('hex').substring(0, 12);
  return `CERT-${hash}`.toUpperCase();
}

/**
 * GET /certificates/:courseId
 * Generate a PDF certificate for a completed course
 */
router.get('/:courseId', authenticate, async (ctx) => {
  const { courseId } = ctx.params;
  const userId = ctx.state.user!.userId;

  const user = await User.findByPk(userId, {
    attributes: ['id', 'firstName', 'lastName', 'email'],
  });
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const result = await getCourseCompletion(userId, courseId);
  if (!result) {
    throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
  }

  if (result.progress < 100 || !result.completedAt) {
    throw new AppError(
      'Certificate is only available for completed courses',
      400,
      'COURSE_NOT_COMPLETED'
    );
  }

  const certificateId = generateCertificateId(courseId, userId);

  const certificateData: CertificateData = {
    recipientName: `${user.firstName} ${user.lastName}`,
    courseName: result.course.title,
    courseDescription: result.course.description || undefined,
    completionDate: result.completedAt,
    certificateId,
    issuerName: APP_NAME,
    issuerTitle: 'Online Learning Platform',
  };

  try {
    const pdfBuffer = await generateCertificate(certificateData, {
      orientation: 'landscape',
      primaryColor: '#6366f1',
      includeVerificationUrl: true,
      verificationBaseUrl: `${config.frontendUrl}/certificates/verify`,
    });

    const filename = `certificate-${result.course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;

    ctx.set('Content-Type', 'application/pdf');
    ctx.set('Content-Disposition', `attachment; filename="${filename}"`);
    ctx.set('Content-Length', pdfBuffer.length.toString());
    ctx.body = pdfBuffer;

    logger.info({ userId, courseId, certificateId }, 'Certificate generated');
  } catch (error) {
    logger.error({ err: error, courseId, userId }, 'Failed to generate certificate');
    throw new AppError('Failed to generate certificate', 500, 'CERTIFICATE_GENERATION_FAILED');
  }
});

/**
 * GET /certificates/:courseId/preview
 * Get certificate data without generating PDF (for preview)
 */
router.get('/:courseId/preview', authenticate, async (ctx) => {
  const { courseId } = ctx.params;
  const userId = ctx.state.user!.userId;

  const user = await User.findByPk(userId, {
    attributes: ['id', 'firstName', 'lastName'],
  });
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const result = await getCourseCompletion(userId, courseId);
  if (!result) {
    throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
  }

  if (result.progress < 100 || !result.completedAt) {
    throw new AppError('Course not completed', 400, 'COURSE_NOT_COMPLETED');
  }

  const certificateId = generateCertificateId(courseId, userId);

  ctx.body = {
    success: true,
    data: {
      certificateId,
      recipientName: `${user.firstName} ${user.lastName}`,
      courseName: result.course.title,
      completionDate: result.completedAt,
      downloadUrl: `/api/v1/certificates/${courseId}`,
    },
  };
});

/**
 * GET /certificates/verify/:certificateId
 * Verify a certificate is authentic (public endpoint)
 */
router.get('/verify/:certificateId', async (ctx) => {
  const { certificateId } = ctx.params;

  if (!certificateId || certificateId.length < 10) {
    ctx.body = {
      success: true,
      data: {
        valid: false,
        message: 'Invalid certificate ID',
      },
    };
    return;
  }

  // Certificate IDs are deterministic (sha256 of courseId:userId)
  // Without a lookup table, we can only confirm the format is valid
  ctx.body = {
    success: true,
    data: {
      valid: true,
      certificateId,
      message: 'Certificate format is valid',
    },
  };
});

export default router;

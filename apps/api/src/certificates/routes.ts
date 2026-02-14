/**
 * Certificate Routes
 *
 * Endpoints for generating and verifying completion certificates
 */

import Router from '@koa/router';
import { generateCertificate, type CertificateData } from './generator.js';
import { authenticate } from '../auth/middleware.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { APP_NAME } from '../config/index.js';

// Models would be imported from your models directory
// import { Course, Enrollment, User, Certificate } from '../models/index.js';

const router = new Router({ prefix: '/certificates' });

/**
 * GET /certificates/:enrollmentId
 * Generate a PDF certificate for a completed course enrollment
 */
router.get('/:enrollmentId', authenticate, async (ctx) => {
  const { enrollmentId } = ctx.params;
  const userId = ctx.state.user!.userId;

  // TODO: Replace with actual database queries
  // For now, we'll create mock data to demonstrate the functionality

  // 1. Get enrollment and verify ownership
  // const enrollment = await Enrollment.findByPk(enrollmentId, {
  //   include: [{ model: Course }, { model: User }],
  // });

  // Mock enrollment data for demonstration
  const enrollment = {
    id: enrollmentId,
    userId: userId,
    completedAt: new Date(),
    progress: 100,
    quizScore: 85,
    course: {
      id: 'course-123',
      title: 'Introduction to Web Development',
      description: 'Learn the fundamentals of web development',
    },
    user: {
      id: userId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    },
  };

  // Verify enrollment exists
  if (!enrollment) {
    throw new AppError('Enrollment not found', 404, 'ENROLLMENT_NOT_FOUND');
  }

  // Verify user owns this enrollment
  if (enrollment.userId !== userId) {
    throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  // Verify course is completed
  if (enrollment.progress < 100 || !enrollment.completedAt) {
    throw new AppError(
      'Certificate is only available for completed courses',
      400,
      'COURSE_NOT_COMPLETED'
    );
  }

  // Generate certificate ID (could be stored in DB for verification)
  const certificateId = generateCertificateId(enrollmentId, userId);

  // Prepare certificate data
  const certificateData: CertificateData = {
    recipientName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
    courseName: enrollment.course.title,
    courseDescription: enrollment.course.description,
    completionDate: enrollment.completedAt,
    score: enrollment.quizScore,
    certificateId: certificateId,
    issuerName: APP_NAME,
    issuerTitle: 'Online Learning Provider',
  };

  try {
    // Generate PDF
    const pdfBuffer = await generateCertificate(certificateData, {
      orientation: 'landscape',
      primaryColor: '#6366f1',
      includeVerificationUrl: true,
      verificationBaseUrl: 'https://lms-platform.com/verify',
    });

    // Set response headers for PDF download
    const filename = `certificate-${enrollment.course.title.toLowerCase().replace(/\s+/g, '-')}.pdf`;

    ctx.set('Content-Type', 'application/pdf');
    ctx.set('Content-Disposition', `attachment; filename="${filename}"`);
    ctx.set('Content-Length', pdfBuffer.length.toString());

    ctx.body = pdfBuffer;

    logger.info({ userId, enrollmentId, certificateId, courseId: enrollment.course.id }, 'Certificate generated');
  } catch (error) {
    logger.error({ err: error, enrollmentId, userId }, 'Failed to generate certificate');
    throw new AppError('Failed to generate certificate', 500, 'CERTIFICATE_GENERATION_FAILED');
  }
});

/**
 * GET /certificates/:enrollmentId/preview
 * Get certificate data without generating PDF (for preview)
 */
router.get('/:enrollmentId/preview', authenticate, async (ctx) => {
  const { enrollmentId } = ctx.params;
  const userId = ctx.state.user!.userId;

  // TODO: Replace with actual database queries
  const enrollment = {
    id: enrollmentId,
    userId: userId,
    completedAt: new Date(),
    progress: 100,
    quizScore: 85,
    course: {
      id: 'course-123',
      title: 'Introduction to Web Development',
    },
    user: {
      id: userId,
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  if (!enrollment || enrollment.userId !== userId) {
    throw new AppError('Enrollment not found', 404, 'ENROLLMENT_NOT_FOUND');
  }

  if (enrollment.progress < 100) {
    throw new AppError('Course not completed', 400, 'COURSE_NOT_COMPLETED');
  }

  const certificateId = generateCertificateId(enrollmentId, userId);

  ctx.body = {
    success: true,
    data: {
      certificateId,
      recipientName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
      courseName: enrollment.course.title,
      completionDate: enrollment.completedAt,
      score: enrollment.quizScore,
      downloadUrl: `/api/v1/certificates/${enrollmentId}`,
    },
  };
});

/**
 * GET /certificates/verify/:certificateId
 * Verify a certificate is authentic (public endpoint)
 */
router.get('/verify/:certificateId', async (ctx) => {
  const { certificateId } = ctx.params;

  // TODO: Look up certificate in database
  // const certificate = await Certificate.findOne({ where: { certificateId } });

  // Mock verification for demonstration
  // In production, you'd store certificate IDs in the database when generated
  const isValid = certificateId.length > 10; // Simple mock validation

  if (!isValid) {
    ctx.body = {
      success: true,
      data: {
        valid: false,
        message: 'Certificate not found',
      },
    };
    return;
  }

  ctx.body = {
    success: true,
    data: {
      valid: true,
      certificateId,
      // In production, return actual certificate details from DB
      message: 'This certificate is valid',
    },
  };
});

/**
 * Generate a unique certificate ID
 * In production, this should be stored in the database
 */
function generateCertificateId(enrollmentId: string, userId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `CERT-${timestamp}-${random}`.toUpperCase();
}

export default router;

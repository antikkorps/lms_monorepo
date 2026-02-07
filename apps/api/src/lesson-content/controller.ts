import type { Context } from 'koa';
import { LessonContent, Lesson, Chapter, Course } from '../database/models/index.js';
import { UserRole, SupportedLocale, TranscodingStatus } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { isTranscodingAvailable, getTranscoding } from '../services/transcoding/index.js';
import { addSubmitTranscodingJob } from '../queue/index.js';
import { logger } from '../utils/logger.js';
import type {
  CreateLessonContentInput,
  UpdateLessonContentInput,
  UpsertLessonContentInput,
} from './schemas.js';

interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  tenantId?: string | null;
}

function getAuthenticatedUser(ctx: Context): AuthenticatedUser {
  const user = ctx.state.user as AuthenticatedUser | undefined;
  if (!user) {
    throw AppError.unauthorized('Authentication required');
  }
  return user;
}

/**
 * Check if user can manage lesson content
 * Only course instructor, tenant admin, or super admin can manage
 */
async function canManageLessonContent(
  user: AuthenticatedUser,
  lessonId: string
): Promise<boolean> {
  // Super admin can always manage
  if (user.role === UserRole.SUPER_ADMIN) {
    return true;
  }

  // Tenant admin can manage all content in their tenant scope
  if (user.role === UserRole.TENANT_ADMIN) {
    return true;
  }

  // Find the lesson with its course
  const lesson = await Lesson.findByPk(lessonId, {
    include: [
      {
        model: Chapter,
        as: 'chapter',
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'instructorId'],
          },
        ],
      },
    ],
  });

  if (!lesson || !lesson.chapter?.course) {
    return false;
  }

  const course = lesson.chapter.course;

  // Course instructor can manage
  if (course.instructorId === user.userId) {
    return true;
  }

  return false;
}

function serializeLessonContent(c: LessonContent) {
  return {
    id: c.id,
    lessonId: c.lessonId,
    lang: c.lang,
    title: c.title,
    videoUrl: c.videoUrl,
    videoId: c.videoId,
    transcript: c.transcript,
    description: c.description,
    transcodingStatus: c.transcodingStatus,
    videoSourceKey: c.videoSourceKey,
    videoPlaybackUrl: c.videoPlaybackUrl,
    videoStreamId: c.videoStreamId,
    transcodingError: c.transcodingError,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

async function triggerTranscoding(content: LessonContent, videoSourceKey: string): Promise<void> {
  if (!isTranscodingAvailable()) return;

  await content.update({
    transcodingStatus: TranscodingStatus.PENDING,
    transcodingError: null,
    videoPlaybackUrl: null,
    videoStreamId: null,
  });

  await addSubmitTranscodingJob({
    lessonContentId: content.id,
    lessonId: content.lessonId,
    lang: content.lang,
    videoSourceKey,
  });

  logger.info({ lessonContentId: content.id, videoSourceKey }, 'Transcoding job enqueued');
}

// =============================================================================
// List all content for a lesson
// =============================================================================

export async function listLessonContents(ctx: Context): Promise<void> {
  const { lessonId } = ctx.params;
  const { lang } = ctx.query as { lang?: SupportedLocale };

  // Verify lesson exists
  const lesson = await Lesson.findByPk(lessonId);
  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  const where: Record<string, unknown> = { lessonId };
  if (lang) {
    where.lang = lang;
  }

  const contents = await LessonContent.findAll({
    where,
    order: [['lang', 'ASC']],
  });

  ctx.body = {
    data: contents.map(serializeLessonContent),
  };
}

// =============================================================================
// Get a specific content by lesson and lang
// =============================================================================

export async function getLessonContentByLang(ctx: Context): Promise<void> {
  const { lessonId, lang } = ctx.params;

  // Validate lang
  if (!Object.values(SupportedLocale).includes(lang as SupportedLocale)) {
    throw AppError.badRequest(`Invalid locale: ${lang}`);
  }

  // Verify lesson exists
  const lesson = await Lesson.findByPk(lessonId);
  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  const content = await LessonContent.findOne({
    where: { lessonId, lang },
  });

  if (!content) {
    // Return null data instead of 404 (content may not exist yet)
    ctx.body = { data: null };
    return;
  }

  ctx.body = {
    data: serializeLessonContent(content),
  };
}

// =============================================================================
// Create lesson content
// =============================================================================

export async function createLessonContent(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { lessonId } = ctx.params;
  const input = ctx.request.body as CreateLessonContentInput;

  // Verify lesson exists
  const lesson = await Lesson.findByPk(lessonId);
  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  // Check permissions
  const canManage = await canManageLessonContent(user, lessonId);
  if (!canManage) {
    throw AppError.forbidden('You do not have permission to manage this lesson content');
  }

  // Check if content already exists for this lang
  const existing = await LessonContent.findOne({
    where: { lessonId, lang: input.lang },
  });

  if (existing) {
    throw AppError.conflict(`Content for locale '${input.lang}' already exists for this lesson`);
  }

  const content = await LessonContent.create({
    lessonId,
    lang: input.lang,
    title: input.title,
    videoUrl: input.videoUrl,
    videoId: input.videoId,
    videoSourceKey: input.videoSourceKey,
    transcript: input.transcript,
    description: input.description,
  });

  if (input.videoSourceKey && isTranscodingAvailable()) {
    await triggerTranscoding(content, input.videoSourceKey);
  }

  ctx.status = 201;
  ctx.body = {
    data: serializeLessonContent(content),
  };
}

// =============================================================================
// Upsert (create or update) lesson content
// =============================================================================

export async function upsertLessonContent(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { lessonId } = ctx.params;
  const input = ctx.request.body as UpsertLessonContentInput;

  // Verify lesson exists
  const lesson = await Lesson.findByPk(lessonId);
  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  // Check permissions
  const canManage = await canManageLessonContent(user, lessonId);
  if (!canManage) {
    throw AppError.forbidden('You do not have permission to manage this lesson content');
  }

  // Find or create
  const [content, created] = await LessonContent.findOrCreate({
    where: { lessonId, lang: input.lang },
    defaults: {
      lessonId,
      lang: input.lang,
      title: input.title,
      videoUrl: input.videoUrl,
      videoId: input.videoId,
      videoSourceKey: input.videoSourceKey,
      transcript: input.transcript,
      description: input.description,
    },
  });

  if (!created) {
    // Update existing
    await content.update({
      title: input.title,
      videoUrl: input.videoUrl,
      videoId: input.videoId,
      videoSourceKey: input.videoSourceKey,
      transcript: input.transcript,
      description: input.description,
    });
  }

  // Trigger transcoding if a new video source key was provided
  if (input.videoSourceKey && isTranscodingAvailable()) {
    await triggerTranscoding(content, input.videoSourceKey);
  }

  ctx.status = created ? 201 : 200;
  ctx.body = {
    data: serializeLessonContent(content),
  };
}

// =============================================================================
// Update lesson content
// =============================================================================

export async function updateLessonContent(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { lessonId, lang } = ctx.params;
  const input = ctx.request.body as UpdateLessonContentInput;

  // Validate lang
  if (!Object.values(SupportedLocale).includes(lang as SupportedLocale)) {
    throw AppError.badRequest(`Invalid locale: ${lang}`);
  }

  // Check permissions
  const canManage = await canManageLessonContent(user, lessonId);
  if (!canManage) {
    throw AppError.forbidden('You do not have permission to manage this lesson content');
  }

  const content = await LessonContent.findOne({
    where: { lessonId, lang },
  });

  if (!content) {
    throw AppError.notFound(`Content for locale '${lang}' not found for this lesson`);
  }

  await content.update({
    title: input.title,
    videoUrl: input.videoUrl,
    videoId: input.videoId,
    videoSourceKey: input.videoSourceKey,
    transcript: input.transcript,
    description: input.description,
  });

  // Trigger transcoding if a new video source key was provided
  if (input.videoSourceKey && isTranscodingAvailable()) {
    await triggerTranscoding(content, input.videoSourceKey);
  }

  ctx.body = {
    data: serializeLessonContent(content),
  };
}

// =============================================================================
// Delete lesson content
// =============================================================================

export async function deleteLessonContent(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { lessonId, lang } = ctx.params;

  // Validate lang
  if (!Object.values(SupportedLocale).includes(lang as SupportedLocale)) {
    throw AppError.badRequest(`Invalid locale: ${lang}`);
  }

  // Check permissions
  const canManage = await canManageLessonContent(user, lessonId);
  if (!canManage) {
    throw AppError.forbidden('You do not have permission to manage this lesson content');
  }

  const content = await LessonContent.findOne({
    where: { lessonId, lang },
  });

  if (!content) {
    throw AppError.notFound(`Content for locale '${lang}' not found for this lesson`);
  }

  // Clean up Cloudflare Stream asset if exists
  if (content.videoStreamId && isTranscodingAvailable()) {
    try {
      await getTranscoding().delete(content.videoStreamId);
    } catch (err) {
      logger.warn({ videoStreamId: content.videoStreamId, error: err }, 'Failed to delete Stream asset');
    }
  }

  await content.destroy();
  ctx.status = 204;
}

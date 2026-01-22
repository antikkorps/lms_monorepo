import type { Context } from 'koa';
import { LessonContent, Lesson, Chapter, Course } from '../database/models/index.js';
import { UserRole, SupportedLocale } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
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
    data: contents.map((c) => ({
      id: c.id,
      lessonId: c.lessonId,
      lang: c.lang,
      title: c.title,
      videoUrl: c.videoUrl,
      videoId: c.videoId,
      transcript: c.transcript,
      description: c.description,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
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
    data: {
      id: content.id,
      lessonId: content.lessonId,
      lang: content.lang,
      title: content.title,
      videoUrl: content.videoUrl,
      videoId: content.videoId,
      transcript: content.transcript,
      description: content.description,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    },
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
    transcript: input.transcript,
    description: input.description,
  });

  ctx.status = 201;
  ctx.body = {
    data: {
      id: content.id,
      lessonId: content.lessonId,
      lang: content.lang,
      title: content.title,
      videoUrl: content.videoUrl,
      videoId: content.videoId,
      transcript: content.transcript,
      description: content.description,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    },
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
      transcript: input.transcript,
      description: input.description,
    });
  }

  ctx.status = created ? 201 : 200;
  ctx.body = {
    data: {
      id: content.id,
      lessonId: content.lessonId,
      lang: content.lang,
      title: content.title,
      videoUrl: content.videoUrl,
      videoId: content.videoId,
      transcript: content.transcript,
      description: content.description,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    },
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
    transcript: input.transcript,
    description: input.description,
  });

  ctx.body = {
    data: {
      id: content.id,
      lessonId: content.lessonId,
      lang: content.lang,
      title: content.title,
      videoUrl: content.videoUrl,
      videoId: content.videoId,
      transcript: content.transcript,
      description: content.description,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    },
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

  await content.destroy();
  ctx.status = 204;
}

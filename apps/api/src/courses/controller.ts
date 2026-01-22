import type { Context } from 'koa';
import { Op } from 'sequelize';
import { Course, Chapter, Lesson, User, LessonContent } from '../database/models/index.js';
import { CourseStatus, UserRole, LessonType } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { sequelize } from '../database/sequelize.js';
import { parseLocaleFromRequest, getLocalizedLessonContent } from '../utils/locale.js';
import slugify from 'slugify';

// Type for authenticated user from context
interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId?: string;
}

/**
 * Get authenticated user from context (throws if not authenticated)
 */
function getAuthenticatedUser(ctx: Context): AuthenticatedUser {
  const user = ctx.state.user as AuthenticatedUser | undefined;
  if (!user) {
    throw AppError.unauthorized('Authentication required');
  }
  return user;
}

/**
 * Check if user can edit a course
 */
function canEditCourse(user: AuthenticatedUser, course: Course): boolean {
  return (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.TENANT_ADMIN ||
    course.instructorId === user.id
  );
}

// =============================================================================
// Course CRUD
// =============================================================================

/**
 * List courses with pagination and filters
 * GET /courses
 */
export async function listCourses(ctx: Context): Promise<void> {
  const {
    page = 1,
    limit = 20,
    status,
    instructorId,
    search,
    sort = 'createdAt',
    order = 'DESC',
  } = ctx.query as {
    page?: number;
    limit?: number;
    status?: CourseStatus;
    instructorId?: string;
    search?: string;
    sort?: string;
    order?: 'ASC' | 'DESC';
  };

  const offset = (Number(page) - 1) * Number(limit);
  const where: Record<string, unknown> = {};

  // Public users can only see published courses
  const user = ctx.state.user as AuthenticatedUser | undefined;
  if (!user || user.role === UserRole.LEARNER) {
    where.status = CourseStatus.PUBLISHED;
  } else if (status) {
    where.status = status;
  }

  if (instructorId) {
    where.instructorId = instructorId;
  }

  if (search) {
    where[Op.or as unknown as string] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { rows: courses, count } = await Course.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'instructor',
        attributes: ['id', 'firstName', 'lastName', 'avatarUrl'],
      },
    ],
    order: [[sort, order]],
    limit: Number(limit),
    offset,
  });

  ctx.body = {
    data: courses,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count,
      totalPages: Math.ceil(count / Number(limit)),
    },
  };
}

/**
 * Get course by ID or slug
 * GET /courses/:id
 * Supports locale via Accept-Language header or ?lang= query param
 */
export async function getCourse(ctx: Context): Promise<void> {
  const { id } = ctx.params;
  const { lang } = ctx.query as { lang?: string };

  // Parse locale from request
  const locale = parseLocaleFromRequest(
    ctx.get('Accept-Language'),
    lang
  );

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const where = isUUID ? { id } : { slug: id };

  const course = await Course.findOne({
    where,
    include: [
      {
        model: User,
        as: 'instructor',
        attributes: ['id', 'firstName', 'lastName', 'avatarUrl'],
      },
      {
        model: Chapter,
        as: 'chapters',
        include: [
          {
            model: Lesson,
            as: 'lessons',
            attributes: ['id', 'title', 'type', 'duration', 'position', 'isFree', 'videoUrl', 'videoId'],
            include: [
              {
                model: LessonContent,
                as: 'contents',
                required: false,
              },
            ],
          },
        ],
      },
    ],
    order: [
      [{ model: Chapter, as: 'chapters' }, 'position', 'ASC'],
      [{ model: Chapter, as: 'chapters' }, { model: Lesson, as: 'lessons' }, 'position', 'ASC'],
    ],
  });

  if (!course) {
    throw AppError.notFound('Course not found');
  }

  // Check if user can view unpublished courses
  const user = ctx.state.user as AuthenticatedUser | undefined;
  if (course.status !== CourseStatus.PUBLISHED) {
    if (!user) {
      throw AppError.notFound('Course not found');
    }
    if (!canEditCourse(user, course)) {
      throw AppError.notFound('Course not found');
    }
  }

  // Transform course to apply localization to lessons
  const courseData = course.toJSON() as Record<string, unknown>;

  if (course.chapters) {
    courseData.chapters = course.chapters.map((chapter) => {
      const chapterData = chapter.toJSON() as Record<string, unknown>;
      if (chapter.lessons) {
        chapterData.lessons = chapter.lessons.map((lesson) => {
          const localized = getLocalizedLessonContent(lesson, locale);
          return {
            id: lesson.id,
            title: localized.title,
            type: lesson.type,
            duration: lesson.duration,
            position: lesson.position,
            isFree: lesson.isFree,
            videoUrl: localized.videoUrl,
            videoId: localized.videoId,
            // Include transcript and description if available
            ...(localized.transcript && { transcript: localized.transcript }),
            ...(localized.description && { description: localized.description }),
          };
        });
      }
      return chapterData;
    });
  }

  // Add locale info to response
  courseData.locale = locale;

  ctx.body = { data: courseData };
}

/**
 * Create a new course
 * POST /courses
 */
export async function createCourse(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { title, slug, description, thumbnailUrl, price } = ctx.request.body as {
    title: string;
    slug?: string;
    description?: string;
    thumbnailUrl?: string;
    price?: number;
  };

  const courseSlug = slug || slugify(title, { lower: true, strict: true });

  const existing = await Course.findOne({ where: { slug: courseSlug } });
  if (existing) {
    throw AppError.conflict('A course with this slug already exists');
  }

  const course = await Course.create({
    title,
    slug: courseSlug,
    description: description || null,
    thumbnailUrl: thumbnailUrl || null,
    price: price || 0,
    instructorId: user.id,
    status: CourseStatus.DRAFT,
  });

  ctx.status = 201;
  ctx.body = { data: course };
}

/**
 * Update a course
 * PATCH /courses/:id
 */
export async function updateCourse(ctx: Context): Promise<void> {
  const { id } = ctx.params;
  const user = getAuthenticatedUser(ctx);
  const updates = ctx.request.body as {
    title?: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    status?: CourseStatus;
    price?: number;
  };

  const course = await Course.findByPk(id);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  if (!canEditCourse(user, course)) {
    throw AppError.forbidden('You do not have permission to edit this course');
  }

  if (updates.status === CourseStatus.PUBLISHED && course.lessonsCount === 0) {
    throw AppError.badRequest('Cannot publish a course without lessons');
  }

  await course.update(updates);
  ctx.body = { data: course };
}

/**
 * Delete a course (soft delete)
 * DELETE /courses/:id
 */
export async function deleteCourse(ctx: Context): Promise<void> {
  const { id } = ctx.params;
  const user = getAuthenticatedUser(ctx);

  const course = await Course.findByPk(id);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  if (!canEditCourse(user, course)) {
    throw AppError.forbidden('You do not have permission to delete this course');
  }

  await course.destroy();
  ctx.status = 204;
}

/**
 * Publish a course
 * POST /courses/:id/publish
 */
export async function publishCourse(ctx: Context): Promise<void> {
  const { id } = ctx.params;
  const user = getAuthenticatedUser(ctx);

  const course = await Course.findByPk(id);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  if (!canEditCourse(user, course)) {
    throw AppError.forbidden('You do not have permission to publish this course');
  }

  if (course.lessonsCount === 0) {
    throw AppError.badRequest('Cannot publish a course without lessons');
  }

  await course.update({ status: CourseStatus.PUBLISHED });
  ctx.body = { data: course };
}

/**
 * Get instructor's own courses
 * GET /courses/my
 */
export async function getMyCourses(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { page = 1, limit = 20, status } = ctx.query as {
    page?: number;
    limit?: number;
    status?: CourseStatus;
  };

  const offset = (Number(page) - 1) * Number(limit);
  const where: Record<string, unknown> = { instructorId: user.id };

  if (status) {
    where.status = status;
  }

  const { rows: courses, count } = await Course.findAndCountAll({
    where,
    order: [['updatedAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  ctx.body = {
    data: courses,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count,
      totalPages: Math.ceil(count / Number(limit)),
    },
  };
}

// =============================================================================
// Chapter CRUD
// =============================================================================

/**
 * List chapters for a course
 * GET /courses/:courseId/chapters
 */
export async function listChapters(ctx: Context): Promise<void> {
  const { courseId } = ctx.params;

  const course = await Course.findByPk(courseId);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  const chapters = await Chapter.findAll({
    where: { courseId },
    include: [
      {
        model: Lesson,
        as: 'lessons',
        attributes: ['id', 'title', 'type', 'duration', 'position', 'isFree'],
      },
    ],
    order: [
      ['position', 'ASC'],
      [{ model: Lesson, as: 'lessons' }, 'position', 'ASC'],
    ],
  });

  ctx.body = { data: chapters };
}

/**
 * Create a chapter
 * POST /courses/:courseId/chapters
 */
export async function createChapter(ctx: Context): Promise<void> {
  const { courseId } = ctx.params;
  const user = getAuthenticatedUser(ctx);
  const { title, description, position } = ctx.request.body as {
    title: string;
    description?: string;
    position?: number;
  };

  const course = await Course.findByPk(courseId);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  if (!canEditCourse(user, course)) {
    throw AppError.forbidden('You do not have permission to edit this course');
  }

  let chapterPosition = position;
  if (chapterPosition === undefined) {
    const maxPosition = await Chapter.max('position', { where: { courseId } });
    chapterPosition = ((maxPosition as number) || 0) + 1;
  }

  const chapter = await Chapter.create({
    courseId,
    title,
    description: description || null,
    position: chapterPosition,
  });

  await course.increment('chaptersCount');

  ctx.status = 201;
  ctx.body = { data: chapter };
}

/**
 * Update a chapter
 * PATCH /courses/:courseId/chapters/:id
 */
export async function updateChapter(ctx: Context): Promise<void> {
  const { courseId, id } = ctx.params;
  const user = getAuthenticatedUser(ctx);
  const updates = ctx.request.body as {
    title?: string;
    description?: string | null;
    position?: number;
  };

  const course = await Course.findByPk(courseId);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  if (!canEditCourse(user, course)) {
    throw AppError.forbidden('You do not have permission to edit this course');
  }

  const chapter = await Chapter.findOne({ where: { id, courseId } });
  if (!chapter) {
    throw AppError.notFound('Chapter not found');
  }

  await chapter.update(updates);
  ctx.body = { data: chapter };
}

/**
 * Delete a chapter
 * DELETE /courses/:courseId/chapters/:id
 */
export async function deleteChapter(ctx: Context): Promise<void> {
  const { courseId, id } = ctx.params;
  const user = getAuthenticatedUser(ctx);

  const course = await Course.findByPk(courseId);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  if (!canEditCourse(user, course)) {
    throw AppError.forbidden('You do not have permission to edit this course');
  }

  const chapter = await Chapter.findOne({
    where: { id, courseId },
    include: [{ model: Lesson, as: 'lessons' }],
  });
  if (!chapter) {
    throw AppError.notFound('Chapter not found');
  }

  const lessonCount = chapter.lessons?.length || 0;

  await chapter.destroy();
  await course.decrement('chaptersCount');
  if (lessonCount > 0) {
    await course.decrement('lessonsCount', { by: lessonCount });
  }

  ctx.status = 204;
}

/**
 * Reorder chapters
 * PATCH /courses/:courseId/chapters/reorder
 */
export async function reorderChapters(ctx: Context): Promise<void> {
  const { courseId } = ctx.params;
  const user = getAuthenticatedUser(ctx);
  const { order } = ctx.request.body as { order: string[] };

  const course = await Course.findByPk(courseId);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  if (!canEditCourse(user, course)) {
    throw AppError.forbidden('You do not have permission to edit this course');
  }

  await sequelize.transaction(async (t) => {
    for (let i = 0; i < order.length; i++) {
      await Chapter.update(
        { position: i },
        { where: { id: order[i], courseId }, transaction: t }
      );
    }
  });

  ctx.body = { message: 'Chapters reordered successfully' };
}

// =============================================================================
// Lesson CRUD
// =============================================================================

/**
 * List lessons for a chapter
 * GET /courses/:courseId/chapters/:chapterId/lessons
 */
export async function listLessons(ctx: Context): Promise<void> {
  const { courseId, chapterId } = ctx.params;
  const { lang } = ctx.query as { lang?: string };

  const locale = parseLocaleFromRequest(
    ctx.get('Accept-Language'),
    lang
  );

  const chapter = await Chapter.findOne({ where: { id: chapterId, courseId } });
  if (!chapter) {
    throw AppError.notFound('Chapter not found');
  }

  const lessons = await Lesson.findAll({
    where: { chapterId },
    include: [
      {
        model: LessonContent,
        as: 'contents',
        required: false,
      },
    ],
    order: [['position', 'ASC']],
  });

  // Apply localization
  const localizedLessons = lessons.map((lesson) => {
    const localized = getLocalizedLessonContent(lesson, locale);
    return {
      id: lesson.id,
      title: localized.title,
      type: lesson.type,
      duration: lesson.duration,
      position: lesson.position,
      isFree: lesson.isFree,
      videoUrl: localized.videoUrl,
      videoId: localized.videoId,
      ...(localized.transcript && { transcript: localized.transcript }),
      ...(localized.description && { description: localized.description }),
    };
  });

  ctx.body = { data: localizedLessons, locale };
}

/**
 * Get a single lesson with localized content
 * GET /lessons/:id
 */
export async function getLesson(ctx: Context): Promise<void> {
  const { id } = ctx.params;
  const { lang } = ctx.query as { lang?: string };

  const locale = parseLocaleFromRequest(
    ctx.get('Accept-Language'),
    lang
  );

  const lesson = await Lesson.findByPk(id, {
    include: [
      {
        model: LessonContent,
        as: 'contents',
        required: false,
      },
      {
        model: Chapter,
        as: 'chapter',
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title', 'slug', 'status'],
          },
        ],
      },
    ],
  });

  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  // Check if user can view unpublished course lessons
  const course = lesson.chapter?.course;
  if (course && course.status !== CourseStatus.PUBLISHED) {
    const user = ctx.state.user as AuthenticatedUser | undefined;
    if (!user) {
      throw AppError.notFound('Lesson not found');
    }
    if (!canEditCourse(user, course)) {
      throw AppError.notFound('Lesson not found');
    }
  }

  // Apply localization
  const localized = getLocalizedLessonContent(lesson, locale);

  ctx.body = {
    data: {
      id: lesson.id,
      title: localized.title,
      type: lesson.type,
      duration: lesson.duration,
      position: lesson.position,
      isFree: lesson.isFree,
      requiresPrevious: lesson.requiresPrevious,
      videoUrl: localized.videoUrl,
      videoId: localized.videoId,
      transcript: localized.transcript,
      description: localized.description,
      chapter: lesson.chapter ? {
        id: lesson.chapter.id,
        title: lesson.chapter.title,
        course: lesson.chapter.course ? {
          id: lesson.chapter.course.id,
          title: lesson.chapter.course.title,
          slug: lesson.chapter.course.slug,
        } : null,
      } : null,
    },
    locale,
  };
}

/**
 * Create a lesson
 * POST /courses/:courseId/chapters/:chapterId/lessons
 */
export async function createLesson(ctx: Context): Promise<void> {
  const { courseId, chapterId } = ctx.params;
  const user = getAuthenticatedUser(ctx);
  const { title, type, videoUrl, videoId, duration, position, isFree, requiresPrevious } =
    ctx.request.body as {
      title: string;
      type?: LessonType;
      videoUrl?: string;
      videoId?: string;
      duration?: number;
      position?: number;
      isFree?: boolean;
      requiresPrevious?: boolean;
    };

  const course = await Course.findByPk(courseId);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  if (!canEditCourse(user, course)) {
    throw AppError.forbidden('You do not have permission to edit this course');
  }

  const chapter = await Chapter.findOne({ where: { id: chapterId, courseId } });
  if (!chapter) {
    throw AppError.notFound('Chapter not found');
  }

  let lessonPosition = position;
  if (lessonPosition === undefined) {
    const maxPosition = await Lesson.max('position', { where: { chapterId } });
    lessonPosition = ((maxPosition as number) || 0) + 1;
  }

  const lesson = await Lesson.create({
    chapterId,
    title,
    type: type || LessonType.VIDEO,
    videoUrl: videoUrl || null,
    videoId: videoId || null,
    duration: duration || 0,
    position: lessonPosition,
    isFree: isFree || false,
    requiresPrevious: requiresPrevious !== false,
  });

  await course.increment('lessonsCount');
  if (duration) {
    await course.increment('duration', { by: duration });
  }

  ctx.status = 201;
  ctx.body = { data: lesson };
}

/**
 * Update a lesson
 * PATCH /lessons/:id
 */
export async function updateLesson(ctx: Context): Promise<void> {
  const { id } = ctx.params;
  const user = getAuthenticatedUser(ctx);
  const updates = ctx.request.body as {
    title?: string;
    type?: LessonType;
    videoUrl?: string | null;
    videoId?: string | null;
    duration?: number;
    position?: number;
    isFree?: boolean;
    requiresPrevious?: boolean;
  };

  const lesson = await Lesson.findByPk(id, {
    include: [
      {
        model: Chapter,
        as: 'chapter',
        include: [{ model: Course, as: 'course' }],
      },
    ],
  });

  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  const course = lesson.chapter?.course;
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  if (!canEditCourse(user, course)) {
    throw AppError.forbidden('You do not have permission to edit this course');
  }

  const oldDuration = lesson.duration;
  await lesson.update(updates);

  if (updates.duration !== undefined && updates.duration !== oldDuration) {
    const durationDiff = updates.duration - oldDuration;
    if (durationDiff > 0) {
      await course.increment('duration', { by: durationDiff });
    } else {
      await course.decrement('duration', { by: Math.abs(durationDiff) });
    }
  }

  ctx.body = { data: lesson };
}

/**
 * Delete a lesson
 * DELETE /lessons/:id
 */
export async function deleteLesson(ctx: Context): Promise<void> {
  const { id } = ctx.params;
  const user = getAuthenticatedUser(ctx);

  const lesson = await Lesson.findByPk(id, {
    include: [
      {
        model: Chapter,
        as: 'chapter',
        include: [{ model: Course, as: 'course' }],
      },
    ],
  });

  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  const course = lesson.chapter?.course;
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  if (!canEditCourse(user, course)) {
    throw AppError.forbidden('You do not have permission to edit this course');
  }

  const duration = lesson.duration;
  await lesson.destroy();

  await course.decrement('lessonsCount');
  if (duration > 0) {
    await course.decrement('duration', { by: duration });
  }

  ctx.status = 204;
}

/**
 * Reorder lessons within a chapter
 * PATCH /courses/:courseId/chapters/:chapterId/lessons/reorder
 */
export async function reorderLessons(ctx: Context): Promise<void> {
  const { courseId, chapterId } = ctx.params;
  const user = getAuthenticatedUser(ctx);
  const { order } = ctx.request.body as { order: string[] };

  const course = await Course.findByPk(courseId);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  if (!canEditCourse(user, course)) {
    throw AppError.forbidden('You do not have permission to edit this course');
  }

  const chapter = await Chapter.findOne({ where: { id: chapterId, courseId } });
  if (!chapter) {
    throw AppError.notFound('Chapter not found');
  }

  await sequelize.transaction(async (t) => {
    for (let i = 0; i < order.length; i++) {
      await Lesson.update(
        { position: i },
        { where: { id: order[i], chapterId }, transaction: t }
      );
    }
  });

  ctx.body = { message: 'Lessons reordered successfully' };
}

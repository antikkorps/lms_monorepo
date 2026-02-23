import type { Context } from 'koa';
import { Op } from 'sequelize';
import { CoursePath } from '../database/models/CoursePath.js';
import { CoursePathItem } from '../database/models/CoursePathItem.js';
import { CoursePrerequisite } from '../database/models/CoursePrerequisite.js';
import { Course } from '../database/models/Course.js';
import { User } from '../database/models/User.js';
import { UserProgress } from '../database/models/UserProgress.js';
import { CourseStatus } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import {
  createPathSchema,
  updatePathSchema,
  addPathCourseSchema,
  reorderPathCoursesSchema,
  setPrerequisitesSchema,
} from './schemas.js';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 255);
}

// =============================================================================
// Path CRUD
// =============================================================================

export async function listPaths(ctx: Context): Promise<void> {
  const page = Number(ctx.query.page) || 1;
  const limit = Math.min(Number(ctx.query.limit) || 20, 50);
  const offset = (page - 1) * limit;
  const status = ctx.query.status as string | undefined;

  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  } else if (!ctx.state.user) {
    where.status = CourseStatus.PUBLISHED;
  }

  const { count, rows } = await CoursePath.findAndCountAll({
    where,
    include: [
      { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  ctx.body = {
    success: true,
    data: {
      paths: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    },
  };
}

export async function getPath(ctx: Context): Promise<void> {
  const { id } = ctx.params;

  const path = await CoursePath.findOne({
    where: { [Op.or]: [{ id }, { slug: id }] },
    include: [
      { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] },
      {
        model: CoursePathItem,
        as: 'items',
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title', 'slug', 'description', 'thumbnailUrl', 'duration', 'lessonsCount', 'status'],
          },
        ],
        order: [['position', 'ASC']],
      },
    ],
  });

  if (!path) {
    throw AppError.notFound('Path not found');
  }

  ctx.body = {
    success: true,
    data: path,
  };
}

export async function createPath(ctx: Context): Promise<void> {
  const userId = ctx.state.user!.userId;
  const parsed = createPathSchema.parse(ctx.request.body);

  const slug = parsed.slug || generateSlug(parsed.title);

  const existing = await CoursePath.findOne({ where: { slug } });
  if (existing) {
    throw AppError.conflict('A path with this slug already exists');
  }

  const path = await CoursePath.create({
    ...parsed,
    slug,
    createdById: userId,
  });

  logger.info({ pathId: path.id, userId }, 'Course path created');

  ctx.status = 201;
  ctx.body = {
    success: true,
    data: path,
  };
}

export async function updatePath(ctx: Context): Promise<void> {
  const { id } = ctx.params;
  const parsed = updatePathSchema.parse(ctx.request.body);

  const path = await CoursePath.findByPk(id);
  if (!path) {
    throw AppError.notFound('Path not found');
  }

  await path.update({
    ...parsed,
    status: parsed.status ? (parsed.status as CourseStatus) : undefined,
  });

  ctx.body = {
    success: true,
    data: path,
  };
}

export async function deletePath(ctx: Context): Promise<void> {
  const { id } = ctx.params;

  const path = await CoursePath.findByPk(id);
  if (!path) {
    throw AppError.notFound('Path not found');
  }

  await path.destroy();

  ctx.status = 204;
}

// =============================================================================
// Path Courses (add/remove/reorder)
// =============================================================================

export async function addCourseToPath(ctx: Context): Promise<void> {
  const { id } = ctx.params;
  const parsed = addPathCourseSchema.parse(ctx.request.body);

  const path = await CoursePath.findByPk(id);
  if (!path) {
    throw AppError.notFound('Path not found');
  }

  const course = await Course.findByPk(parsed.courseId);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  const existing = await CoursePathItem.findOne({
    where: { pathId: id, courseId: parsed.courseId },
  });
  if (existing) {
    throw AppError.conflict('Course is already in this path');
  }

  // Get next position if not specified
  const position = parsed.position ?? path.coursesCount;

  await CoursePathItem.create({
    pathId: id,
    courseId: parsed.courseId,
    position,
  });

  // Update aggregates
  const itemCount = await CoursePathItem.count({ where: { pathId: id } });
  const items = await CoursePathItem.findAll({
    where: { pathId: id },
    include: [{ model: Course, as: 'course', attributes: ['duration'] }],
  });
  const totalDuration = items.reduce((sum, item) => sum + (item.course?.duration || 0), 0);

  await path.update({ coursesCount: itemCount, estimatedDuration: totalDuration });

  ctx.status = 201;
  ctx.body = { success: true };
}

export async function removeCourseFromPath(ctx: Context): Promise<void> {
  const { id, courseId } = ctx.params;

  const item = await CoursePathItem.findOne({
    where: { pathId: id, courseId },
  });

  if (!item) {
    throw AppError.notFound('Course not found in path');
  }

  await item.destroy();

  // Update aggregates
  const path = await CoursePath.findByPk(id);
  if (path) {
    const itemCount = await CoursePathItem.count({ where: { pathId: id } });
    const items = await CoursePathItem.findAll({
      where: { pathId: id },
      include: [{ model: Course, as: 'course', attributes: ['duration'] }],
    });
    const totalDuration = items.reduce((sum, i) => sum + (i.course?.duration || 0), 0);
    await path.update({ coursesCount: itemCount, estimatedDuration: totalDuration });
  }

  ctx.status = 204;
}

export async function reorderPathCourses(ctx: Context): Promise<void> {
  const { id } = ctx.params;
  const { order } = reorderPathCoursesSchema.parse(ctx.request.body);

  const path = await CoursePath.findByPk(id);
  if (!path) {
    throw AppError.notFound('Path not found');
  }

  for (let i = 0; i < order.length; i++) {
    await CoursePathItem.update(
      { position: i },
      { where: { pathId: id, courseId: order[i] } }
    );
  }

  ctx.body = { success: true };
}

// =============================================================================
// Path Progress
// =============================================================================

export async function getPathProgress(ctx: Context): Promise<void> {
  const { id } = ctx.params;
  const userId = ctx.state.user!.userId;

  const path = await CoursePath.findByPk(id, {
    include: [
      {
        model: CoursePathItem,
        as: 'items',
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title', 'slug', 'lessonsCount'],
          },
        ],
        order: [['position', 'ASC']],
      },
    ],
  });

  if (!path) {
    throw AppError.notFound('Path not found');
  }

  const items = (path as any).items as CoursePathItem[] || [];
  const courseProgress = await Promise.all(
    items.map(async (item) => {
      if (!item.course) return { courseId: item.courseId, progress: 0, completed: false };

      const completedLessons = await UserProgress.count({
        where: {
          userId,
          courseId: item.courseId,
          completed: true,
        },
      });

      const totalLessons = item.course.lessonsCount || 0;
      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        courseId: item.courseId,
        progress,
        completed: progress === 100,
      };
    })
  );

  const completedCourses = courseProgress.filter(cp => cp.completed).length;
  const totalCourses = courseProgress.length;
  const overallProgress = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

  ctx.body = {
    success: true,
    data: {
      pathId: id,
      overallProgress,
      completedCourses,
      totalCourses,
      courses: courseProgress,
    },
  };
}

// =============================================================================
// Prerequisites
// =============================================================================

export async function getPrerequisites(ctx: Context): Promise<void> {
  const { id } = ctx.params;

  const course = await Course.findByPk(id);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  const prerequisiteLinks = await CoursePrerequisite.findAll({
    where: { courseId: id },
  });

  const prerequisiteIds = prerequisiteLinks.map(p => p.prerequisiteCourseId);

  const prerequisites = prerequisiteIds.length > 0
    ? await Course.findAll({
        where: { id: { [Op.in]: prerequisiteIds } },
        attributes: ['id', 'title', 'slug', 'thumbnailUrl', 'duration', 'lessonsCount'],
      })
    : [];

  ctx.body = {
    success: true,
    data: prerequisites,
  };
}

export async function setPrerequisites(ctx: Context): Promise<void> {
  const { id } = ctx.params;
  const { prerequisiteIds } = setPrerequisitesSchema.parse(ctx.request.body);

  const course = await Course.findByPk(id);
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  // Validate no self-reference
  if (prerequisiteIds.includes(id)) {
    throw AppError.badRequest('A course cannot be its own prerequisite');
  }

  // Validate all prerequisite courses exist
  if (prerequisiteIds.length > 0) {
    const courses = await Course.findAll({
      where: { id: { [Op.in]: prerequisiteIds } },
      attributes: ['id'],
    });
    if (courses.length !== prerequisiteIds.length) {
      throw AppError.badRequest('One or more prerequisite courses not found');
    }
  }

  // Replace all prerequisites
  await CoursePrerequisite.destroy({ where: { courseId: id } });

  if (prerequisiteIds.length > 0) {
    await CoursePrerequisite.bulkCreate(
      prerequisiteIds.map(prerequisiteCourseId => ({
        courseId: id,
        prerequisiteCourseId,
      }))
    );
  }

  logger.info({ courseId: id, prerequisiteIds }, 'Course prerequisites updated');

  ctx.body = { success: true };
}

// =============================================================================
// Check Prerequisites Met (utility for course access)
// =============================================================================

export async function checkPrerequisitesMet(ctx: Context): Promise<void> {
  const { id } = ctx.params;
  const userId = ctx.state.user!.userId;

  const prerequisites = await CoursePrerequisite.findAll({
    where: { courseId: id },
  });

  if (prerequisites.length === 0) {
    ctx.body = { success: true, data: { met: true, missing: [] } };
    return;
  }

  const missing: string[] = [];

  for (const prereq of prerequisites) {
    const course = await Course.findByPk(prereq.prerequisiteCourseId, {
      attributes: ['id', 'title', 'lessonsCount'],
    });
    if (!course) continue;

    const completedLessons = await UserProgress.count({
      where: {
        userId,
        courseId: prereq.prerequisiteCourseId,
        completed: true,
      },
    });

    if (completedLessons < (course.lessonsCount || 0)) {
      missing.push(prereq.prerequisiteCourseId);
    }
  }

  ctx.body = {
    success: true,
    data: {
      met: missing.length === 0,
      missing,
    },
  };
}

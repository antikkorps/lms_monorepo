import type { Context } from 'koa';
import { Op } from 'sequelize';
import { Note, Lesson, Chapter, Course } from '../database/models/index.js';
import { UserRole } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import type { UpsertNoteInput } from './schemas.js';

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

// =============================================================================
// Note CRUD
// =============================================================================

export async function getNoteForLesson(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { lessonId } = ctx.params;

  // Verify lesson exists
  const lesson = await Lesson.findByPk(lessonId);
  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  const note = await Note.findOne({
    where: {
      userId: user.userId,
      lessonId,
    },
  });

  if (!note) {
    // Return empty note structure instead of 404
    ctx.body = {
      data: null,
    };
    return;
  }

  ctx.body = {
    data: {
      id: note.id,
      lessonId: note.lessonId,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    },
  };
}

export async function upsertNoteForLesson(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { lessonId } = ctx.params;
  const { content } = ctx.request.body as UpsertNoteInput;

  // Verify lesson exists
  const lesson = await Lesson.findByPk(lessonId);
  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  // Upsert: find existing or create new
  const [note, created] = await Note.findOrCreate({
    where: {
      userId: user.userId,
      lessonId,
    },
    defaults: {
      userId: user.userId,
      lessonId,
      content,
    },
  });

  if (!created) {
    // Update existing note
    await note.update({ content });
  }

  ctx.status = created ? 201 : 200;
  ctx.body = {
    data: {
      id: note.id,
      lessonId: note.lessonId,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    },
  };
}

export async function deleteNoteForLesson(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { lessonId } = ctx.params;

  const note = await Note.findOne({
    where: {
      userId: user.userId,
      lessonId,
    },
  });

  if (!note) {
    throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
  }

  await note.destroy();
  ctx.status = 204;
}

export async function listMyNotes(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { page = 1, limit = 20, search } = ctx.query as {
    page?: number;
    limit?: number;
    search?: string;
  };

  const offset = (Number(page) - 1) * Number(limit);
  const where: Record<string, unknown> = {
    userId: user.userId,
  };

  if (search) {
    where.content = { [Op.iLike]: `%${search}%` };
  }

  const { rows: notes, count } = await Note.findAndCountAll({
    where,
    include: [
      {
        model: Lesson,
        as: 'lesson',
        attributes: ['id', 'title', 'type'],
        include: [
          {
            model: Chapter,
            as: 'chapter',
            attributes: ['id', 'title'],
            include: [
              {
                model: Course,
                as: 'course',
                attributes: ['id', 'title', 'slug'],
              },
            ],
          },
        ],
      },
    ],
    order: [['updatedAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  ctx.body = {
    data: notes.map((n) => ({
      id: n.id,
      lessonId: n.lessonId,
      content: n.content,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      lesson: n.lesson
        ? {
            id: n.lesson.id,
            title: n.lesson.title,
            type: n.lesson.type,
            chapter: n.lesson.chapter
              ? {
                  id: n.lesson.chapter.id,
                  title: n.lesson.chapter.title,
                  course: n.lesson.chapter.course
                    ? {
                        id: n.lesson.chapter.course.id,
                        title: n.lesson.chapter.course.title,
                        slug: n.lesson.chapter.course.slug,
                      }
                    : null,
                }
              : null,
          }
        : null,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count,
      totalPages: Math.ceil(count / Number(limit)),
    },
  };
}

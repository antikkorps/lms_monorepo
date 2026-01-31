import type { Context } from 'koa';
import { Op } from 'sequelize';
import {
  Discussion,
  DiscussionReply,
  DiscussionReport,
  Lesson,
  User,
  Tenant,
  Course,
  Chapter,
} from '../database/models/index.js';
import {
  UserRole,
  ReportReason,
  DiscussionVisibility,
} from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import type {
  CreateDiscussionInput,
  CreateReplyInput,
  ReportInput,
  DeleteDiscussionInput,
} from './schemas.js';
import { onDiscussionReply } from '../triggers/notification.triggers.js';

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

async function checkDiscussionsEnabled(tenantId: string | null | undefined): Promise<void> {
  if (tenantId) {
    const tenant = await Tenant.findByPk(tenantId);
    if (tenant?.settings?.discussionsEnabled === false) {
      throw new AppError('Discussions are disabled for this tenant', 403, 'DISCUSSIONS_DISABLED');
    }
  }
}

async function canDeleteDiscussion(
  user: AuthenticatedUser,
  discussion: Discussion
): Promise<boolean> {
  // Author can delete their own
  if (discussion.userId === user.userId) {
    return true;
  }

  // SuperAdmin can delete any
  if (user.role === UserRole.SUPER_ADMIN) {
    return true;
  }

  // TenantAdmin can delete within their tenant
  if (
    user.role === UserRole.TENANT_ADMIN &&
    user.tenantId &&
    discussion.tenantId === user.tenantId
  ) {
    return true;
  }

  // Instructor can delete if they own the course
  if (user.role === UserRole.INSTRUCTOR) {
    const lesson = await Lesson.findByPk(discussion.lessonId, {
      include: [
        {
          model: Chapter,
          as: 'chapter',
          include: [{ model: Course, as: 'course' }],
        },
      ],
    });
    if (lesson?.chapter?.course?.instructorId === user.userId) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// Discussion CRUD
// =============================================================================

export async function listDiscussions(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { lessonId, page, limit } = ctx.query as unknown as {
    lessonId: string;
    page: number;
    limit: number;
  };

  // Verify lesson exists
  const lesson = await Lesson.findByPk(lessonId);
  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  await checkDiscussionsEnabled(user.tenantId);

  const offset = (page - 1) * limit;
  const where: Record<string, unknown> = {
    lessonId,
    isDeleted: false,
  };

  // Apply tenant isolation logic
  if (!user.tenantId) {
    // B2C users: see only public pool (tenantId = null)
    where.tenantId = null;
  } else {
    // B2B users: check tenant visibility setting
    const tenant = await Tenant.findByPk(user.tenantId);
    const visibility =
      tenant?.settings?.discussionVisibility || DiscussionVisibility.TENANT_ONLY;

    if (visibility === DiscussionVisibility.TENANT_ONLY) {
      where.tenantId = user.tenantId;
    } else {
      // PUBLIC_POOL: can see own tenant + public
      where[Op.or as unknown as string] = [
        { tenantId: user.tenantId },
        { tenantId: null },
      ];
    }
  }

  const { rows: discussions, count } = await Discussion.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'avatarUrl'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  ctx.body = {
    data: discussions.map((d) => ({
      id: d.id,
      lessonId: d.lessonId,
      content: d.content,
      replyCount: d.replyCount,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      user: d.user
        ? {
            id: d.user.id,
            firstName: d.user.firstName,
            lastName: d.user.lastName,
            avatarUrl: d.user.avatarUrl,
          }
        : null,
      isOwner: d.userId === user.userId,
    })),
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

export async function createDiscussion(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { lessonId, content } = ctx.request.body as CreateDiscussionInput;

  // Verify lesson exists
  const lesson = await Lesson.findByPk(lessonId);
  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  await checkDiscussionsEnabled(user.tenantId);

  const discussion = await Discussion.create({
    lessonId,
    userId: user.userId,
    tenantId: user.tenantId || null,
    content,
  });

  // Fetch with user info
  const fullDiscussion = await Discussion.findByPk(discussion.id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'avatarUrl'],
      },
    ],
  });

  ctx.status = 201;
  ctx.body = {
    data: {
      id: fullDiscussion!.id,
      lessonId: fullDiscussion!.lessonId,
      content: fullDiscussion!.content,
      replyCount: fullDiscussion!.replyCount,
      createdAt: fullDiscussion!.createdAt,
      updatedAt: fullDiscussion!.updatedAt,
      user: fullDiscussion!.user
        ? {
            id: fullDiscussion!.user.id,
            firstName: fullDiscussion!.user.firstName,
            lastName: fullDiscussion!.user.lastName,
            avatarUrl: fullDiscussion!.user.avatarUrl,
          }
        : null,
      isOwner: true,
    },
  };
}

export async function deleteDiscussion(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { id } = ctx.params;
  const { reason } = (ctx.request.body || {}) as DeleteDiscussionInput;

  const discussion = await Discussion.findByPk(id);
  if (!discussion) {
    throw new AppError('Discussion not found', 404, 'DISCUSSION_NOT_FOUND');
  }

  if (discussion.isDeleted) {
    throw new AppError('Discussion already deleted', 400, 'DISCUSSION_DELETED');
  }

  const canDelete = await canDeleteDiscussion(user, discussion);
  if (!canDelete) {
    throw AppError.forbidden('You do not have permission to delete this discussion');
  }

  await discussion.update({
    isDeleted: true,
    deletedById: user.userId,
    deletedReason: reason || null,
  });

  ctx.status = 204;
}

export async function reportDiscussion(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { id } = ctx.params;
  const { reason, description } = ctx.request.body as ReportInput;

  const discussion = await Discussion.findByPk(id);
  if (!discussion) {
    throw new AppError('Discussion not found', 404, 'DISCUSSION_NOT_FOUND');
  }

  if (discussion.isDeleted) {
    throw new AppError('Discussion already deleted', 400, 'DISCUSSION_DELETED');
  }

  // Can't report own content
  if (discussion.userId === user.userId) {
    throw new AppError('You cannot report your own content', 400, 'CANNOT_REPORT_OWN');
  }

  // Check if already reported by this user
  const existingReport = await DiscussionReport.findOne({
    where: {
      discussionId: id,
      reportedById: user.userId,
    },
  });

  if (existingReport) {
    throw new AppError('You have already reported this discussion', 400, 'ALREADY_REPORTED');
  }

  await DiscussionReport.create({
    discussionId: id,
    reportedById: user.userId,
    reason: reason as ReportReason,
    description: description || null,
  });

  ctx.status = 201;
  ctx.body = { message: 'Report submitted successfully' };
}

// =============================================================================
// Reply CRUD
// =============================================================================

export async function listReplies(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { id } = ctx.params;
  const { page = 1, limit = 50 } = ctx.query as { page?: number; limit?: number };

  const discussion = await Discussion.findByPk(id);
  if (!discussion) {
    throw new AppError('Discussion not found', 404, 'DISCUSSION_NOT_FOUND');
  }

  if (discussion.isDeleted) {
    throw new AppError('Discussion has been deleted', 400, 'DISCUSSION_DELETED');
  }

  const offset = (Number(page) - 1) * Number(limit);

  const { rows: replies, count } = await DiscussionReply.findAndCountAll({
    where: {
      discussionId: id,
      isDeleted: false,
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'avatarUrl'],
      },
    ],
    order: [['createdAt', 'ASC']],
    limit: Number(limit),
    offset,
  });

  ctx.body = {
    data: replies.map((r) => ({
      id: r.id,
      discussionId: r.discussionId,
      content: r.content,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: r.user
        ? {
            id: r.user.id,
            firstName: r.user.firstName,
            lastName: r.user.lastName,
            avatarUrl: r.user.avatarUrl,
          }
        : null,
      isOwner: r.userId === user.userId,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count,
      totalPages: Math.ceil(count / Number(limit)),
    },
  };
}

export async function createReply(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { id } = ctx.params;
  const { content } = ctx.request.body as CreateReplyInput;

  const discussion = await Discussion.findByPk(id);
  if (!discussion) {
    throw new AppError('Discussion not found', 404, 'DISCUSSION_NOT_FOUND');
  }

  if (discussion.isDeleted) {
    throw new AppError('Discussion has been deleted', 400, 'DISCUSSION_DELETED');
  }

  await checkDiscussionsEnabled(user.tenantId);

  const reply = await DiscussionReply.create({
    discussionId: id,
    userId: user.userId,
    content,
  });

  // Increment reply count
  await discussion.increment('replyCount');

  // Fetch with user info
  const fullReply = await DiscussionReply.findByPk(reply.id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'avatarUrl'],
      },
    ],
  });

  // Send notification to discussion author
  if (fullReply?.user) {
    const authorName = `${fullReply.user.firstName} ${fullReply.user.lastName}`;
    onDiscussionReply(reply, discussion, authorName);
  }

  ctx.status = 201;
  ctx.body = {
    data: {
      id: fullReply!.id,
      discussionId: fullReply!.discussionId,
      content: fullReply!.content,
      createdAt: fullReply!.createdAt,
      updatedAt: fullReply!.updatedAt,
      user: fullReply!.user
        ? {
            id: fullReply!.user.id,
            firstName: fullReply!.user.firstName,
            lastName: fullReply!.user.lastName,
            avatarUrl: fullReply!.user.avatarUrl,
          }
        : null,
      isOwner: true,
    },
  };
}

export async function deleteReply(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { id: discussionId, replyId } = ctx.params;
  const { reason } = (ctx.request.body || {}) as DeleteDiscussionInput;

  const discussion = await Discussion.findByPk(discussionId);
  if (!discussion) {
    throw new AppError('Discussion not found', 404, 'DISCUSSION_NOT_FOUND');
  }

  const reply = await DiscussionReply.findOne({
    where: { id: replyId, discussionId },
  });

  if (!reply) {
    throw new AppError('Reply not found', 404, 'REPLY_NOT_FOUND');
  }

  if (reply.isDeleted) {
    throw new AppError('Reply already deleted', 400, 'REPLY_DELETED');
  }

  // Check permission - similar logic to discussion
  let canDelete = false;
  if (reply.userId === user.userId) {
    canDelete = true;
  } else if (user.role === UserRole.SUPER_ADMIN) {
    canDelete = true;
  } else if (
    user.role === UserRole.TENANT_ADMIN &&
    user.tenantId &&
    discussion.tenantId === user.tenantId
  ) {
    canDelete = true;
  } else if (user.role === UserRole.INSTRUCTOR) {
    const lesson = await Lesson.findByPk(discussion.lessonId, {
      include: [
        {
          model: Chapter,
          as: 'chapter',
          include: [{ model: Course, as: 'course' }],
        },
      ],
    });
    if (lesson?.chapter?.course?.instructorId === user.userId) {
      canDelete = true;
    }
  }

  if (!canDelete) {
    throw AppError.forbidden('You do not have permission to delete this reply');
  }

  await reply.update({
    isDeleted: true,
    deletedById: user.userId,
    deletedReason: reason || null,
  });

  // Decrement reply count
  await discussion.decrement('replyCount');

  ctx.status = 204;
}

export async function reportReply(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { id: discussionId, replyId } = ctx.params;
  const { reason, description } = ctx.request.body as ReportInput;

  const discussion = await Discussion.findByPk(discussionId);
  if (!discussion) {
    throw new AppError('Discussion not found', 404, 'DISCUSSION_NOT_FOUND');
  }

  const reply = await DiscussionReply.findOne({
    where: { id: replyId, discussionId },
  });

  if (!reply) {
    throw new AppError('Reply not found', 404, 'REPLY_NOT_FOUND');
  }

  if (reply.isDeleted) {
    throw new AppError('Reply has been deleted', 400, 'REPLY_DELETED');
  }

  // Can't report own content
  if (reply.userId === user.userId) {
    throw new AppError('You cannot report your own content', 400, 'CANNOT_REPORT_OWN');
  }

  // Check if already reported by this user
  const existingReport = await DiscussionReport.findOne({
    where: {
      replyId,
      reportedById: user.userId,
    },
  });

  if (existingReport) {
    throw new AppError('You have already reported this reply', 400, 'ALREADY_REPORTED');
  }

  await DiscussionReport.create({
    replyId,
    reportedById: user.userId,
    reason: reason as ReportReason,
    description: description || null,
  });

  ctx.status = 201;
  ctx.body = { message: 'Report submitted successfully' };
}

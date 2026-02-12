import type { Context } from 'koa';
import { LessonContent, Lesson, Chapter, Course } from '../database/models/index.js';
import { UserRole, SupportedLocale, TranscodingStatus } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { isTranscodingAvailable } from '../services/transcoding/index.js';
import { addSubmitTranscodingJob } from '../queue/index.js';

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

async function canManageLessonContent(
  user: AuthenticatedUser,
  lessonId: string
): Promise<boolean> {
  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.TENANT_ADMIN) {
    return true;
  }
  const lesson = await Lesson.findByPk(lessonId, {
    include: [{
      model: Chapter,
      as: 'chapter',
      include: [{ model: Course, as: 'course', attributes: ['id', 'instructorId'] }],
    }],
  });
  if (!lesson || !lesson.chapter?.course) return false;
  return lesson.chapter.course.instructorId === user.userId;
}

export async function getTranscodingStatus(ctx: Context): Promise<void> {
  const { lessonId, lang } = ctx.params;

  if (!Object.values(SupportedLocale).includes(lang as SupportedLocale)) {
    throw AppError.badRequest(`Invalid locale: ${lang}`);
  }

  const content = await LessonContent.findOne({ where: { lessonId, lang } });
  if (!content) {
    throw AppError.notFound(`Content for locale '${lang}' not found for this lesson`);
  }

  ctx.body = {
    data: {
      transcodingStatus: content.transcodingStatus,
      videoPlaybackUrl: content.videoPlaybackUrl,
      videoStreamId: content.videoStreamId,
      transcodingError: content.transcodingError,
      videoSourceKey: content.videoSourceKey,
      videoThumbnailUrl: content.videoThumbnailUrl,
    },
  };
}

export async function retryTranscoding(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { lessonId, lang } = ctx.params;

  if (!Object.values(SupportedLocale).includes(lang as SupportedLocale)) {
    throw AppError.badRequest(`Invalid locale: ${lang}`);
  }

  const canManage = await canManageLessonContent(user, lessonId);
  if (!canManage) {
    throw AppError.forbidden('You do not have permission to manage this lesson content');
  }

  if (!isTranscodingAvailable()) {
    throw AppError.badRequest('Transcoding is not available');
  }

  const content = await LessonContent.findOne({ where: { lessonId, lang } });
  if (!content) {
    throw AppError.notFound(`Content for locale '${lang}' not found for this lesson`);
  }

  if (content.transcodingStatus !== TranscodingStatus.ERROR) {
    throw AppError.badRequest('Can only retry transcoding for content with error status');
  }

  if (!content.videoSourceKey) {
    throw AppError.badRequest('No video source key found for this content');
  }

  await content.update({
    transcodingStatus: TranscodingStatus.PENDING,
    transcodingError: null,
    videoPlaybackUrl: null,
    videoStreamId: null,
    videoThumbnailUrl: null,
  });

  await addSubmitTranscodingJob({
    lessonContentId: content.id,
    lessonId: content.lessonId,
    lang: content.lang,
    videoSourceKey: content.videoSourceKey,
  });

  ctx.body = {
    data: {
      transcodingStatus: content.transcodingStatus,
      message: 'Transcoding retry queued',
    },
  };
}

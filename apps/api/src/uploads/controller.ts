/**
 * Uploads Controller
 * Handles file uploads for images, videos, and documents
 */

import type { Context } from 'koa';
import type { File } from '@koa/multer';
import { getStorage, validateFile, type FileCategory } from '../storage/index.js';
import { AppError } from '../utils/app-error.js';
import { UserRole } from '../database/models/enums.js';
import { LessonContent, Lesson, Chapter, Course } from '../database/models/index.js';
import { checkCourseAccess } from '../utils/course-access.js';

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
 * Check if user can upload (instructors, tenant admins, super admins)
 */
function canUpload(user: AuthenticatedUser): boolean {
  return [
    UserRole.INSTRUCTOR,
    UserRole.TENANT_ADMIN,
    UserRole.SUPER_ADMIN,
  ].includes(user.role);
}

/**
 * Authorize read access to a stored file by its key.
 *
 * If the key is a tracked lesson source video, access follows course
 * entitlement (purchase / license / instructor / admin / free). For any other
 * key (images, documents, direct-upload keys not yet attached to content), we
 * fall back to upload-capable roles — never an open signed URL.
 */
async function assertFileAccess(user: AuthenticatedUser, key: string): Promise<void> {
  const content = await LessonContent.findOne({
    where: { videoSourceKey: key },
    include: [
      {
        model: Lesson,
        as: 'lesson',
        include: [
          {
            model: Chapter,
            as: 'chapter',
            include: [{ model: Course, as: 'course', attributes: ['id'] }],
          },
        ],
      },
    ],
  });

  const courseId = content?.lesson?.chapter?.course?.id;

  if (courseId) {
    const access = await checkCourseAccess(user, courseId);
    if (!access.hasAccess) {
      throw AppError.forbidden('You do not have access to this file');
    }
    return;
  }

  // Untracked key: restrict to roles allowed to upload/manage files.
  if (!canUpload(user)) {
    throw AppError.forbidden('You do not have access to this file');
  }
}

/**
 * Upload an image
 * POST /uploads/image
 */
export async function uploadImage(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);

  if (!canUpload(user)) {
    throw AppError.forbidden('Only instructors can upload files');
  }

  const file = ctx.file as File | undefined;
  if (!file) {
    throw AppError.badRequest('No file provided');
  }

  const validation = validateFile(
    { mimetype: file.mimetype, size: file.size, originalname: file.originalname },
    'image'
  );

  if (!validation.valid) {
    throw AppError.badRequest(validation.error!);
  }

  const storage = getStorage();
  const result = await storage.upload(file.buffer, file.originalname, {
    folder: 'images',
    metadata: {
      uploadedBy: user.userId,
      originalName: file.originalname,
    },
  });

  ctx.body = {
    data: {
      key: result.key,
      url: result.url,
      size: result.size,
      contentType: result.contentType,
    },
  };
}

/**
 * Upload a video
 * POST /uploads/video
 */
export async function uploadVideo(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);

  if (!canUpload(user)) {
    throw AppError.forbidden('Only instructors can upload files');
  }

  const file = ctx.file as File | undefined;
  if (!file) {
    throw AppError.badRequest('No file provided');
  }

  const validation = validateFile(
    { mimetype: file.mimetype, size: file.size, originalname: file.originalname },
    'video'
  );

  if (!validation.valid) {
    throw AppError.badRequest(validation.error!);
  }

  const storage = getStorage();
  const result = await storage.upload(file.buffer, file.originalname, {
    folder: 'videos',
    metadata: {
      uploadedBy: user.userId,
      originalName: file.originalname,
    },
  });

  ctx.body = {
    data: {
      key: result.key,
      url: result.url,
      size: result.size,
      contentType: result.contentType,
    },
  };
}

/**
 * Upload a document
 * POST /uploads/document
 */
export async function uploadDocument(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);

  if (!canUpload(user)) {
    throw AppError.forbidden('Only instructors can upload files');
  }

  const file = ctx.file as File | undefined;
  if (!file) {
    throw AppError.badRequest('No file provided');
  }

  const validation = validateFile(
    { mimetype: file.mimetype, size: file.size, originalname: file.originalname },
    'document'
  );

  if (!validation.valid) {
    throw AppError.badRequest(validation.error!);
  }

  const storage = getStorage();
  const result = await storage.upload(file.buffer, file.originalname, {
    folder: 'documents',
    metadata: {
      uploadedBy: user.userId,
      originalName: file.originalname,
    },
  });

  ctx.body = {
    data: {
      key: result.key,
      url: result.url,
      size: result.size,
      contentType: result.contentType,
    },
  };
}

/**
 * Get a signed URL for direct upload (large files)
 * POST /uploads/signed-url
 */
export async function getSignedUploadUrl(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);

  if (!canUpload(user)) {
    throw AppError.forbidden('Only instructors can upload files');
  }

  const { filename, contentType, category } = ctx.request.body as {
    filename: string;
    contentType: string;
    category: FileCategory;
  };

  if (!filename || !contentType || !category) {
    throw AppError.badRequest('filename, contentType, and category are required');
  }

  const storage = getStorage();

  // Generate a unique key
  const ext = filename.split('.').pop() || '';
  const key = `${category}s/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const signedUrl = await storage.getSignedUploadUrl(key, {
      contentType,
      expiresIn: 3600, // 1 hour
    });

    ctx.body = {
      data: {
        key,
        uploadUrl: signedUrl,
        expiresIn: 3600,
      },
    };
  } catch (err) {
    if ((err as Error).message.includes('not supported')) {
      throw AppError.badRequest('Direct upload not supported. Use regular upload endpoint.');
    }
    throw err;
  }
}

/**
 * Delete a file
 * DELETE /uploads/:key
 */
export async function deleteFile(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);

  if (!canUpload(user)) {
    throw AppError.forbidden('Only instructors can delete files');
  }

  // Key is passed as path parameter, URL encoded
  const key = decodeURIComponent(ctx.params.key);

  if (!key) {
    throw AppError.badRequest('File key is required');
  }

  const storage = getStorage();

  // Check if file exists
  const exists = await storage.exists(key);
  if (!exists) {
    throw AppError.notFound('File not found');
  }

  await storage.delete(key);

  ctx.status = 204;
}

/**
 * Get file info / signed URL for private files
 * GET /uploads/:key
 *
 * Signing a URL for ANY key would be an IDOR (e.g. raw source video of a paid
 * course). We resolve the key to its owning course when possible and require
 * course entitlement; otherwise the file is only reachable by upload-capable
 * roles (instructor / tenant admin / super admin).
 */
export async function getFileInfo(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);

  const key = decodeURIComponent(ctx.params.key);

  if (!key) {
    throw AppError.badRequest('File key is required');
  }

  await assertFileAccess(user, key);

  const storage = getStorage();

  const exists = await storage.exists(key);
  if (!exists) {
    throw AppError.notFound('File not found');
  }

  // Get a signed URL for access
  const signedUrl = await storage.getSignedUrl(key, { expiresIn: 3600 });

  ctx.body = {
    data: {
      key,
      url: signedUrl,
      expiresIn: 3600,
    },
  };
}

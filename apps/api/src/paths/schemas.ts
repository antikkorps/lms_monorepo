import { z } from 'zod';

export const createPathSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  description: z.string().max(5000).optional(),
  thumbnailUrl: z.url().optional(),
});

export const updatePathSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  thumbnailUrl: z.url().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

export const addPathCourseSchema = z.object({
  courseId: z.uuid(),
  position: z.number().int().nonnegative().optional(),
});

export const reorderPathCoursesSchema = z.object({
  order: z.array(z.uuid()),
});

export const setPrerequisitesSchema = z.object({
  prerequisiteIds: z.array(z.uuid()).max(10),
});

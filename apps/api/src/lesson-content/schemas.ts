import { z } from 'zod';
import { SupportedLocale } from '../database/models/enums.js';

/**
 * Schema for creating lesson content
 */
export const createLessonContentSchema = z.object({
  lang: z.enum(SupportedLocale),
  title: z.string().max(255).optional().nullable(),
  videoUrl: z.string().url().max(2048).optional().nullable(),
  videoId: z.string().max(255).optional().nullable(),
  videoSourceKey: z.string().max(1024).optional().nullable(),
  transcript: z.string().max(100000).optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
});

/**
 * Schema for updating lesson content
 */
export const updateLessonContentSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  videoUrl: z.string().url().max(2048).optional().nullable(),
  videoId: z.string().max(255).optional().nullable(),
  videoSourceKey: z.string().max(1024).optional().nullable(),
  transcript: z.string().max(100000).optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
});

/**
 * Schema for upsert (create or update) lesson content
 */
export const upsertLessonContentSchema = z.object({
  lang: z.enum(SupportedLocale),
  title: z.string().max(255).optional().nullable(),
  videoUrl: z.string().url().max(2048).optional().nullable(),
  videoId: z.string().max(255).optional().nullable(),
  videoSourceKey: z.string().max(1024).optional().nullable(),
  transcript: z.string().max(100000).optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
});

/**
 * Schema for listing lesson contents (query params)
 */
export const listLessonContentsQuerySchema = z.object({
  lang: z.enum(SupportedLocale).optional(),
});

export type CreateLessonContentInput = z.infer<typeof createLessonContentSchema>;
export type UpdateLessonContentInput = z.infer<typeof updateLessonContentSchema>;
export type UpsertLessonContentInput = z.infer<typeof upsertLessonContentSchema>;
export type ListLessonContentsQuery = z.infer<typeof listLessonContentsQuerySchema>;

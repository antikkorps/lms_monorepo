import { z } from 'zod';
import { sanitizeText } from '../utils/sanitize.js';

export const upsertNoteSchema = z.object({
  content: z.string().min(1).max(50000).transform(sanitizeText),
});

export const listNotesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional().transform((v) => v ? sanitizeText(v) : v),
});

export type UpsertNoteInput = z.infer<typeof upsertNoteSchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;

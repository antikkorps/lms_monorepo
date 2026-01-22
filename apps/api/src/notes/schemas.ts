import { z } from 'zod';

export const upsertNoteSchema = z.object({
  content: z.string().min(1).max(50000),
});

export const listNotesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
});

export type UpsertNoteInput = z.infer<typeof upsertNoteSchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;

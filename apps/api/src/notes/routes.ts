import Router from '@koa/router';
import {
  getNoteForLesson,
  upsertNoteForLesson,
  deleteNoteForLesson,
  listMyNotes,
} from './controller.js';
import { authenticate } from '../auth/middleware.js';
import { validate, validateQuery } from '../middlewares/validate.js';
import { upsertNoteSchema, listNotesQuerySchema } from './schemas.js';

export const notesRouter = new Router({ prefix: '/notes' });

// List all my notes
notesRouter.get(
  '/',
  authenticate,
  validateQuery(listNotesQuerySchema),
  listMyNotes
);

// Get note for a specific lesson
notesRouter.get(
  '/lesson/:lessonId',
  authenticate,
  getNoteForLesson
);

// Create or update note for a specific lesson
notesRouter.put(
  '/lesson/:lessonId',
  authenticate,
  validate(upsertNoteSchema),
  upsertNoteForLesson
);

// Delete note for a specific lesson
notesRouter.delete(
  '/lesson/:lessonId',
  authenticate,
  deleteNoteForLesson
);

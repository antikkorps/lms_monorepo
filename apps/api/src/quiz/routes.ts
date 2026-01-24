import Router from '@koa/router';
import {
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  submitQuiz,
  getQuizResults,
  getQuizResultDetail,
} from './controller.js';
import { authenticate, optionalAuthenticate, requireRole } from '../auth/middleware.js';
import { UserRole } from '../database/models/enums.js';
import { validate } from '../middlewares/validate.js';
import { z } from 'zod';

// Validation schemas
const optionSchema = z.object({
  id: z.string().uuid().optional(),
  text: z.string().min(1).max(1000),
  isCorrect: z.boolean(),
});

const createQuestionSchema = z.object({
  question: z.string().min(1).max(5000),
  options: z
    .array(optionSchema)
    .min(2, 'At least 2 options are required')
    .max(10, 'Maximum 10 options allowed')
    .refine(
      (options) => options.some((opt) => opt.isCorrect),
      'At least one option must be marked as correct'
    ),
  explanation: z.string().max(2000).nullable().optional(),
  type: z.enum(['single_choice', 'multiple_choice', 'true_false']).optional(),
  points: z.number().int().min(1).max(100).default(1),
});

const updateQuestionSchema = z.object({
  question: z.string().min(1).max(5000).optional(),
  options: z
    .array(optionSchema)
    .min(2, 'At least 2 options are required')
    .max(10, 'Maximum 10 options allowed')
    .refine(
      (options) => options.some((opt) => opt.isCorrect),
      'At least one option must be marked as correct'
    )
    .optional(),
  explanation: z.string().max(2000).nullable().optional(),
  type: z.enum(['single_choice', 'multiple_choice', 'true_false']).optional(),
  points: z.number().int().min(1).max(100).optional(),
});

const reorderQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()),
});

// Quiz submission schema
const submitQuizSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOptionIds: z.array(z.string().uuid()),
    })
  ),
});

// Quiz questions are nested under lessons
export const quizRouter = new Router();

// =============================================================================
// Quiz Question routes (nested under /lessons/:lessonId)
// =============================================================================

// List questions for a lesson (authenticated users can view)
quizRouter.get(
  '/lessons/:lessonId/questions',
  optionalAuthenticate,
  listQuestions
);

// Get a single question
quizRouter.get(
  '/lessons/:lessonId/questions/:questionId',
  optionalAuthenticate,
  getQuestion
);

// Create a question (instructor/admin only)
quizRouter.post(
  '/lessons/:lessonId/questions',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(createQuestionSchema),
  createQuestion
);

// Update a question (instructor/admin only)
quizRouter.patch(
  '/lessons/:lessonId/questions/:questionId',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(updateQuestionSchema),
  updateQuestion
);

// Delete a question (instructor/admin only)
quizRouter.delete(
  '/lessons/:lessonId/questions/:questionId',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  deleteQuestion
);

// Reorder questions (instructor/admin only)
// IMPORTANT: This route must come before /:questionId routes
quizRouter.patch(
  '/lessons/:lessonId/questions/reorder',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(reorderQuestionsSchema),
  reorderQuestions
);

// =============================================================================
// Quiz Submission & Results routes
// =============================================================================

// Submit quiz answers for grading (any authenticated user)
quizRouter.post(
  '/lessons/:lessonId/quiz/submit',
  authenticate,
  validate(submitQuizSchema),
  submitQuiz
);

// Get user's quiz results for a lesson
quizRouter.get(
  '/lessons/:lessonId/quiz/results',
  authenticate,
  getQuizResults
);

// Get detailed result for a specific attempt
quizRouter.get(
  '/lessons/:lessonId/quiz/results/:resultId',
  authenticate,
  getQuizResultDetail
);

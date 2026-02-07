import { z } from 'zod';

export const courseStatusEnum = z.enum(['draft', 'published', 'archived']);

export const lessonTypeEnum = z.enum(['video', 'quiz', 'document', 'assignment']);

export const transcodingStatusEnum = z.enum(['pending', 'processing', 'ready', 'error']);

export const quizQuestionTypeEnum = z.enum([
  'single_choice',
  'multiple_choice',
  'true_false',
]);

export const courseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().url().nullable(),
  status: courseStatusEnum,
  price: z.number().nonnegative(),
  instructorId: z.string().uuid(),
  duration: z.number().int().nonnegative(), // Total duration in seconds
  chaptersCount: z.number().int().nonnegative(),
  lessonsCount: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createCourseSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(5000).optional(),
  thumbnailUrl: z.string().url().optional(),
  price: z.number().nonnegative().default(0),
});

export const updateCourseSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  status: courseStatusEnum.optional(),
  price: z.number().nonnegative().optional(),
});

export const chapterSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  position: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createChapterSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  position: z.number().int().nonnegative().optional(),
});

export const lessonSchema = z.object({
  id: z.string().uuid(),
  chapterId: z.string().uuid(),
  title: z.string(),
  type: lessonTypeEnum,
  videoUrl: z.string().url().nullable(),
  duration: z.number().int().nonnegative(), // Duration in seconds
  position: z.number().int().nonnegative(),
  isFree: z.boolean(),
  requiresPrevious: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createLessonSchema = z.object({
  title: z.string().min(1).max(255),
  type: lessonTypeEnum,
  videoUrl: z.string().url().optional(),
  duration: z.number().int().nonnegative().optional(),
  position: z.number().int().nonnegative().optional(),
  isFree: z.boolean().default(false),
  requiresPrevious: z.boolean().default(true),
});

export const quizQuestionSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  question: z.string(),
  type: quizQuestionTypeEnum,
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      isCorrect: z.boolean(),
    })
  ),
  points: z.number().int().positive(),
  position: z.number().int().nonnegative(),
});

export const quizAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedOptionIds: z.array(z.string()),
});

export const submitQuizSchema = z.object({
  lessonId: z.string().uuid(),
  answers: z.array(quizAnswerSchema),
});

// Type exports
export type CourseStatus = z.infer<typeof courseStatusEnum>;
export type LessonType = z.infer<typeof lessonTypeEnum>;
export type TranscodingStatus = z.infer<typeof transcodingStatusEnum>;
export type QuizQuestionType = z.infer<typeof quizQuestionTypeEnum>;
export type Course = z.infer<typeof courseSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
export type CreateChapterInput = z.infer<typeof createChapterSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizAnswer = z.infer<typeof quizAnswerSchema>;
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;

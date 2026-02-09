import type { Context } from 'koa';
import { randomUUID } from 'crypto';
import { QuizQuestion, QuizResult, Lesson, Chapter, Course } from '../database/models/index.js';
import type { QuizAnswer } from '../database/models/QuizResult.js';
import { UserRole, QuizQuestionType } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { sequelize } from '../database/sequelize.js';
import { checkCourseAccessFromLesson } from '../utils/course-access.js';
import { onQuizPassed, onActivityPerformed } from '../triggers/notification.triggers.js';

// Default passing threshold (70%)
const PASSING_THRESHOLD = 0.7;

// Type for authenticated user from context
interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  tenantId?: string | null;
}

/**
 * Get authenticated user from context (throws if not authenticated)
 */
function getAuthenticatedUser(ctx: Context): AuthenticatedUser {
  const user = ctx.state.user as AuthenticatedUser | undefined;
  if (!user) {
    throw AppError.unauthorized('Authentication required');
  }
  return user;
}

/**
 * Check if user can edit a course
 */
function canEditCourse(user: AuthenticatedUser, course: Course): boolean {
  return (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.TENANT_ADMIN ||
    course.instructorId === user.userId
  );
}

/**
 * Get lesson with course info and verify permissions
 */
async function getLessonWithPermissions(
  lessonId: string,
  user: AuthenticatedUser
): Promise<Lesson> {
  const lesson = await Lesson.findByPk(lessonId, {
    include: [
      {
        model: Chapter,
        as: 'chapter',
        include: [{ model: Course, as: 'course' }],
      },
    ],
  });

  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  const course = lesson.chapter?.course;
  if (!course) {
    throw AppError.notFound('Course not found');
  }

  if (!canEditCourse(user, course)) {
    throw AppError.forbidden('You do not have permission to edit this lesson');
  }

  return lesson;
}

// =============================================================================
// Quiz Question CRUD
// =============================================================================

/**
 * List questions for a lesson
 * GET /lessons/:lessonId/questions
 */
export async function listQuestions(ctx: Context): Promise<void> {
  const { lessonId } = ctx.params;

  const lesson = await Lesson.findByPk(lessonId);
  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  const questions = await QuizQuestion.findAll({
    where: { lessonId },
    order: [['position', 'ASC']],
  });

  ctx.body = { data: questions };
}

/**
 * Get a single question
 * GET /lessons/:lessonId/questions/:questionId
 */
export async function getQuestion(ctx: Context): Promise<void> {
  const { lessonId, questionId } = ctx.params;

  const question = await QuizQuestion.findOne({
    where: { id: questionId, lessonId },
  });

  if (!question) {
    throw AppError.notFound('Question not found');
  }

  ctx.body = { data: question };
}

/**
 * Create a question
 * POST /lessons/:lessonId/questions
 */
export async function createQuestion(ctx: Context): Promise<void> {
  const { lessonId } = ctx.params;
  const user = getAuthenticatedUser(ctx);
  const { question, options, type, points } = ctx.request.body as {
    question: string;
    options: Array<{ text: string; isCorrect: boolean }>;
    type?: QuizQuestionType;
    points?: number;
  };

  // Verify permissions
  await getLessonWithPermissions(lessonId, user);

  // Get next position
  const maxPosition = await QuizQuestion.max('position', { where: { lessonId } });
  const position = ((maxPosition as number) || 0) + 1;

  // Add UUIDs to options
  const optionsWithIds = options.map((opt) => ({
    id: randomUUID(),
    text: opt.text,
    isCorrect: opt.isCorrect,
  }));

  // Determine question type based on correct answers if not provided
  let questionType = type;
  if (!questionType) {
    const correctCount = options.filter((opt) => opt.isCorrect).length;
    if (options.length === 2 && options.every((opt) => ['true', 'false', 'vrai', 'faux'].includes(opt.text.toLowerCase()))) {
      questionType = QuizQuestionType.TRUE_FALSE;
    } else if (correctCount > 1) {
      questionType = QuizQuestionType.MULTIPLE_CHOICE;
    } else {
      questionType = QuizQuestionType.SINGLE_CHOICE;
    }
  }

  const newQuestion = await QuizQuestion.create({
    lessonId,
    question,
    options: optionsWithIds,
    type: questionType,
    points: points || 1,
    position,
  });

  ctx.status = 201;
  ctx.body = { data: newQuestion };
}

/**
 * Update a question
 * PATCH /lessons/:lessonId/questions/:questionId
 */
export async function updateQuestion(ctx: Context): Promise<void> {
  const { lessonId, questionId } = ctx.params;
  const user = getAuthenticatedUser(ctx);
  const updates = ctx.request.body as {
    question?: string;
    options?: Array<{ id?: string; text: string; isCorrect: boolean }>;
    explanation?: string | null;
    type?: QuizQuestionType;
    points?: number;
  };

  // Verify permissions
  await getLessonWithPermissions(lessonId, user);

  const existingQuestion = await QuizQuestion.findOne({
    where: { id: questionId, lessonId },
  });

  if (!existingQuestion) {
    throw AppError.notFound('Question not found');
  }

  // Build update object with properly typed options
  const updateData: {
    question?: string;
    options?: Array<{ id: string; text: string; isCorrect: boolean }>;
    type?: QuizQuestionType;
    points?: number;
  } = {};

  if (updates.question !== undefined) {
    updateData.question = updates.question;
  }
  if (updates.type !== undefined) {
    updateData.type = updates.type;
  }
  if (updates.points !== undefined) {
    updateData.points = updates.points;
  }

  // If options are being updated, ensure they have IDs
  if (updates.options) {
    updateData.options = updates.options.map((opt) => ({
      id: opt.id || randomUUID(),
      text: opt.text,
      isCorrect: opt.isCorrect,
    }));
  }

  await existingQuestion.update(updateData);

  ctx.body = { data: existingQuestion };
}

/**
 * Delete a question
 * DELETE /lessons/:lessonId/questions/:questionId
 */
export async function deleteQuestion(ctx: Context): Promise<void> {
  const { lessonId, questionId } = ctx.params;
  const user = getAuthenticatedUser(ctx);

  // Verify permissions
  await getLessonWithPermissions(lessonId, user);

  const question = await QuizQuestion.findOne({
    where: { id: questionId, lessonId },
  });

  if (!question) {
    throw AppError.notFound('Question not found');
  }

  await question.destroy();

  ctx.status = 204;
}

/**
 * Reorder questions
 * PATCH /lessons/:lessonId/questions/reorder
 */
export async function reorderQuestions(ctx: Context): Promise<void> {
  const { lessonId } = ctx.params;
  const user = getAuthenticatedUser(ctx);
  const { questionIds } = ctx.request.body as { questionIds: string[] };

  // Verify permissions
  await getLessonWithPermissions(lessonId, user);

  await sequelize.transaction(async (t) => {
    for (let i = 0; i < questionIds.length; i++) {
      await QuizQuestion.update(
        { position: i },
        { where: { id: questionIds[i], lessonId }, transaction: t }
      );
    }
  });

  ctx.body = { message: 'Questions reordered successfully' };
}

// =============================================================================
// Quiz Submission & Grading
// =============================================================================

interface SubmitAnswerInput {
  questionId: string;
  selectedOptionIds: string[];
}

/**
 * Grade a single question
 */
function gradeQuestion(
  question: QuizQuestion,
  selectedOptionIds: string[]
): { isCorrect: boolean; pointsEarned: number } {
  const correctIds = question.options.filter((opt) => opt.isCorrect).map((opt) => opt.id);

  // For single choice: must select exactly the correct option
  // For multiple choice: must select all correct options and no incorrect ones
  const selectedSet = new Set(selectedOptionIds);
  const correctSet = new Set(correctIds);

  const isCorrect =
    selectedSet.size === correctSet.size &&
    [...selectedSet].every((id) => correctSet.has(id));

  return {
    isCorrect,
    pointsEarned: isCorrect ? question.points : 0,
  };
}

/**
 * Submit quiz answers for grading
 * POST /lessons/:lessonId/quiz/submit
 */
export async function submitQuiz(ctx: Context): Promise<void> {
  const { lessonId } = ctx.params;
  const user = getAuthenticatedUser(ctx);
  const { answers } = ctx.request.body as { answers: SubmitAnswerInput[] };

  // Verify lesson exists
  const lesson = await Lesson.findByPk(lessonId);
  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  // Check course access before submitting quiz
  const accessResult = await checkCourseAccessFromLesson(user, lessonId);
  if (!accessResult.hasAccess) {
    throw new AppError(
      accessResult.reason || 'You do not have access to this course',
      403,
      'COURSE_ACCESS_DENIED'
    );
  }

  // Get all questions for this lesson
  const questions = await QuizQuestion.findAll({
    where: { lessonId },
    order: [['position', 'ASC']],
  });

  if (questions.length === 0) {
    throw AppError.badRequest('This lesson has no quiz questions');
  }

  // Grade each answer
  const gradedAnswers: QuizAnswer[] = [];
  let totalScore = 0;
  let maxScore = 0;

  for (const question of questions) {
    maxScore += question.points;

    const userAnswer = answers.find((a) => a.questionId === question.id);
    const selectedOptionIds = userAnswer?.selectedOptionIds || [];

    const { isCorrect, pointsEarned } = gradeQuestion(question, selectedOptionIds);
    totalScore += pointsEarned;

    gradedAnswers.push({
      questionId: question.id,
      selectedOptionIds,
      isCorrect,
      pointsEarned,
    });
  }

  // Determine if passed
  const passed = maxScore > 0 ? totalScore / maxScore >= PASSING_THRESHOLD : false;

  // Get attempt number
  const previousAttempts = await QuizResult.count({
    where: { userId: user.userId, lessonId },
  });
  const attemptNumber = previousAttempts + 1;

  // Save result
  const result = await QuizResult.create({
    userId: user.userId,
    lessonId,
    score: totalScore,
    maxScore,
    passed,
    answers: gradedAnswers,
    attemptNumber,
    completedAt: new Date(),
  });

  // Send notification if quiz passed
  if (passed) {
    // Get course ID from lesson
    const lessonWithCourse = await Lesson.findByPk(lessonId, {
      include: [
        {
          model: Chapter,
          as: 'chapter',
          include: [{ model: Course, as: 'course', attributes: ['id'] }],
        },
      ],
    });
    const courseId = lessonWithCourse?.chapter?.course?.id;
    if (courseId) {
      onQuizPassed(user.userId, lessonId, courseId, Math.round((totalScore / maxScore) * 100));
    }
  }

  // Track activity for streak
  onActivityPerformed(user.userId, 'quiz_submitted', lessonId);

  ctx.status = 201;
  ctx.body = {
    data: {
      id: result.id,
      score: result.score,
      maxScore: result.maxScore,
      scorePercentage: result.scorePercentage,
      passed: result.passed,
      attemptNumber: result.attemptNumber,
      correctAnswersCount: result.correctAnswersCount,
      totalQuestions: questions.length,
      answers: gradedAnswers,
      completedAt: result.completedAt,
    },
  };
}

/**
 * Get quiz results for a lesson
 * GET /lessons/:lessonId/quiz/results
 */
export async function getQuizResults(ctx: Context): Promise<void> {
  const { lessonId } = ctx.params;
  const user = getAuthenticatedUser(ctx);

  // Verify lesson exists
  const lesson = await Lesson.findByPk(lessonId);
  if (!lesson) {
    throw AppError.notFound('Lesson not found');
  }

  // Get all results for this user and lesson
  const results = await QuizResult.findAll({
    where: { userId: user.userId, lessonId },
    order: [['completedAt', 'DESC']],
  });

  // Get best result
  const bestResult = results.reduce(
    (best, current) => (current.score > best.score ? current : best),
    results[0]
  );

  ctx.body = {
    data: {
      attempts: results.map((r) => ({
        id: r.id,
        score: r.score,
        maxScore: r.maxScore,
        scorePercentage: r.scorePercentage,
        passed: r.passed,
        attemptNumber: r.attemptNumber,
        completedAt: r.completedAt,
      })),
      bestResult: bestResult
        ? {
            id: bestResult.id,
            score: bestResult.score,
            maxScore: bestResult.maxScore,
            scorePercentage: bestResult.scorePercentage,
            passed: bestResult.passed,
            attemptNumber: bestResult.attemptNumber,
            completedAt: bestResult.completedAt,
            answers: bestResult.answers,
          }
        : null,
      totalAttempts: results.length,
      hasPassed: results.some((r) => r.passed),
    },
  };
}

/**
 * Get detailed result for a specific attempt
 * GET /lessons/:lessonId/quiz/results/:resultId
 */
export async function getQuizResultDetail(ctx: Context): Promise<void> {
  const { lessonId, resultId } = ctx.params;
  const user = getAuthenticatedUser(ctx);

  const result = await QuizResult.findOne({
    where: { id: resultId, lessonId, userId: user.userId },
  });

  if (!result) {
    throw AppError.notFound('Quiz result not found');
  }

  // Get questions to provide context
  const questions = await QuizQuestion.findAll({
    where: { lessonId },
    order: [['position', 'ASC']],
  });

  ctx.body = {
    data: {
      id: result.id,
      score: result.score,
      maxScore: result.maxScore,
      scorePercentage: result.scorePercentage,
      passed: result.passed,
      attemptNumber: result.attemptNumber,
      completedAt: result.completedAt,
      answers: result.answers.map((answer) => {
        const question = questions.find((q) => q.id === answer.questionId);
        return {
          ...answer,
          question: question
            ? {
                id: question.id,
                question: question.question,
                type: question.type,
                options: question.options,
                points: question.points,
              }
            : null,
        };
      }),
    },
  };
}

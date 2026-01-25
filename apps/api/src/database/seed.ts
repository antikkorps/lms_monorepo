/**
 * Database Seeding Script
 *
 * Creates initial data for development and testing:
 * - SuperAdmin user
 * - Test tenant with seats
 * - Test users (admin, manager, instructor, learners)
 * - Sample courses with chapters, lessons, and quiz questions
 * - Sample user progress and purchases
 *
 * Usage: npx nx run api:seed
 */

import { sequelize } from './sequelize.js';
import { setupAssociations } from './models/index.js';
import {
  User,
  Tenant,
  Course,
  Chapter,
  Lesson,
  LessonContent,
  QuizQuestion,
  Purchase,
  UserProgress,
  Badge,
  UserBadge,
} from './models/index.js';
import {
  UserRole,
  UserStatus,
  TenantStatus,
  SubscriptionStatus,
  CourseStatus,
  Currency,
  LessonType,
  QuizQuestionType,
  PurchaseStatus,
  SupportedLocale,
} from './models/enums.js';
import type { BadgeCriteria } from './models/Badge.js';
import { hashPassword } from '../auth/password.js';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_PASSWORD = 'Password123!';

// Fixed UUIDs for predictable testing
const IDS = {
  // Users
  superAdmin: '00000000-0000-0000-0000-000000000001',
  instructor: '00000000-0000-0000-0000-000000000002',
  tenantAdmin: '00000000-0000-0000-0000-000000000003',
  learner1: '00000000-0000-0000-0000-000000000004',
  learner2: '00000000-0000-0000-0000-000000000005',
  soloLearner: '00000000-0000-0000-0000-000000000006',

  // Tenant
  tenant: '00000000-0000-0000-0000-000000000100',

  // Courses
  course1: '00000000-0000-0000-0000-000000000200',
  course2: '00000000-0000-0000-0000-000000000201',
  course3: '00000000-0000-0000-0000-000000000202',

  // Chapters
  c1ch1: '00000000-0000-0000-0000-000000000300',
  c1ch2: '00000000-0000-0000-0000-000000000301',
  c1ch3: '00000000-0000-0000-0000-000000000302',
  c2ch1: '00000000-0000-0000-0000-000000000310',
  c2ch2: '00000000-0000-0000-0000-000000000311',

  // Lessons (course 1)
  c1l1: '00000000-0000-0000-0000-000000000400',
  c1l2: '00000000-0000-0000-0000-000000000401',
  c1l3: '00000000-0000-0000-0000-000000000402',
  c1l4: '00000000-0000-0000-0000-000000000403',
  c1l5: '00000000-0000-0000-0000-000000000404',
  c1l6: '00000000-0000-0000-0000-000000000405',
  c1quiz1: '00000000-0000-0000-0000-000000000406',
  c1quiz2: '00000000-0000-0000-0000-000000000407',

  // Lessons (course 2)
  c2l1: '00000000-0000-0000-0000-000000000410',
  c2l2: '00000000-0000-0000-0000-000000000411',
  c2l3: '00000000-0000-0000-0000-000000000412',
  c2quiz1: '00000000-0000-0000-0000-000000000413',

  // Badges
  badge1: '00000000-0000-0000-0000-000000000500',
  badge2: '00000000-0000-0000-0000-000000000501',
  badge3: '00000000-0000-0000-0000-000000000502',
};

// =============================================================================
// Seed Functions
// =============================================================================

async function seedTenants(): Promise<void> {
  logger.info('Seeding tenants...');

  await Tenant.create({
    id: IDS.tenant,
    name: 'Acme Corporation',
    slug: 'acme-corp',
    status: TenantStatus.ACTIVE,
    seatsPurchased: 10,
    seatsUsed: 3,
    subscriptionStatus: SubscriptionStatus.ACTIVE,
  });
}

async function seedUsers(): Promise<void> {
  logger.info('Seeding users...');

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  const users = [
    {
      id: IDS.superAdmin,
      email: 'superadmin@lms.local',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      tenantId: null,
    },
    {
      id: IDS.instructor,
      email: 'instructor@lms.local',
      passwordHash,
      firstName: 'Jean',
      lastName: 'Dupont',
      role: UserRole.INSTRUCTOR,
      status: UserStatus.ACTIVE,
      tenantId: null,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=instructor',
    },
    {
      id: IDS.tenantAdmin,
      email: 'admin@acme-corp.com',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Martin',
      role: UserRole.TENANT_ADMIN,
      status: UserStatus.ACTIVE,
      tenantId: IDS.tenant,
    },
    {
      id: IDS.learner1,
      email: 'learner1@acme-corp.com',
      passwordHash,
      firstName: 'Pierre',
      lastName: 'Bernard',
      role: UserRole.LEARNER,
      status: UserStatus.ACTIVE,
      tenantId: IDS.tenant,
    },
    {
      id: IDS.learner2,
      email: 'learner2@acme-corp.com',
      passwordHash,
      firstName: 'Marie',
      lastName: 'Leroy',
      role: UserRole.LEARNER,
      status: UserStatus.ACTIVE,
      tenantId: IDS.tenant,
    },
    {
      id: IDS.soloLearner,
      email: 'solo@example.com',
      passwordHash,
      firstName: 'Solo',
      lastName: 'Learner',
      role: UserRole.LEARNER,
      status: UserStatus.ACTIVE,
      tenantId: null,
    },
  ];

  await User.bulkCreate(users);
}

async function seedCourses(): Promise<void> {
  logger.info('Seeding courses...');

  const courses = [
    {
      id: IDS.course1,
      title: 'Introduction to TypeScript',
      slug: 'intro-typescript',
      description: `Master TypeScript from the ground up! This comprehensive course covers everything from basic types to advanced patterns.

You'll learn:
- Type annotations and inference
- Interfaces and type aliases
- Generics and utility types
- Classes and decorators
- Module systems
- Best practices for large-scale applications

Perfect for JavaScript developers looking to add type safety to their projects.`,
      status: CourseStatus.PUBLISHED,
      price: 49.99,
      currency: Currency.EUR,
      instructorId: IDS.instructor,
      thumbnailUrl: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800',
      duration: 7200,
      chaptersCount: 3,
      lessonsCount: 8,
    },
    {
      id: IDS.course2,
      title: 'Vue.js 3 Composition API',
      slug: 'vue3-composition-api',
      description: `Take your Vue.js skills to the next level with the Composition API!

This course covers:
- ref, reactive, and computed
- Lifecycle hooks in Composition API
- Custom composables
- Dependency injection with provide/inject
- Integration with TypeScript
- State management patterns

Build more maintainable and scalable Vue applications.`,
      status: CourseStatus.PUBLISHED,
      price: 59.99,
      currency: Currency.USD,
      instructorId: IDS.instructor,
      thumbnailUrl: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=800',
      duration: 10800,
      chaptersCount: 2,
      lessonsCount: 4,
    },
    {
      id: IDS.course3,
      title: 'Building REST APIs with Node.js',
      slug: 'nodejs-rest-apis',
      description: `Learn to build production-ready REST APIs with Node.js and Express.

Coming soon...`,
      status: CourseStatus.DRAFT,
      price: 0,
      currency: Currency.EUR,
      instructorId: IDS.instructor,
      thumbnailUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
      duration: 0,
      chaptersCount: 0,
      lessonsCount: 0,
    },
  ];

  await Course.bulkCreate(courses);
}

async function seedChaptersAndLessons(): Promise<void> {
  logger.info('Seeding chapters and lessons...');

  // Course 1 Chapters
  const chapters = [
    {
      id: IDS.c1ch1,
      courseId: IDS.course1,
      title: 'Getting Started',
      description: 'Setup your development environment and learn the basics',
      position: 0,
    },
    {
      id: IDS.c1ch2,
      courseId: IDS.course1,
      title: 'Type System Deep Dive',
      description: 'Master TypeScript types, interfaces, and type guards',
      position: 1,
    },
    {
      id: IDS.c1ch3,
      courseId: IDS.course1,
      title: 'Advanced Patterns',
      description: 'Generics, decorators, and advanced type manipulation',
      position: 2,
    },
    {
      id: IDS.c2ch1,
      courseId: IDS.course2,
      title: 'Composition API Fundamentals',
      description: 'Learn the core concepts of Vue 3 Composition API',
      position: 0,
    },
    {
      id: IDS.c2ch2,
      courseId: IDS.course2,
      title: 'Building Custom Composables',
      description: 'Create reusable logic with composables',
      position: 1,
    },
  ];

  await Chapter.bulkCreate(chapters);

  // Lessons
  const lessons = [
    // Course 1 - Chapter 1 - TypeScript videos from real content creators
    {
      id: IDS.c1l1,
      chapterId: IDS.c1ch1,
      title: 'Why TypeScript?',
      type: LessonType.VIDEO,
      duration: 600,
      position: 0,
      isFree: true,
      videoUrl: 'https://www.youtube.com/watch?v=zQnBQ4tB3ZA',
      videoId: 'zQnBQ4tB3ZA', // Fireship - TypeScript in 100 seconds
    },
    {
      id: IDS.c1l2,
      chapterId: IDS.c1ch1,
      title: 'Setting Up Your Environment',
      type: LessonType.VIDEO,
      duration: 900,
      position: 1,
      isFree: true,
      videoUrl: 'https://www.youtube.com/watch?v=d56mG7DezGs',
      videoId: 'd56mG7DezGs', // TypeScript Tutorial
    },
    {
      id: IDS.c1l3,
      chapterId: IDS.c1ch1,
      title: 'Your First TypeScript Program',
      type: LessonType.VIDEO,
      duration: 1200,
      position: 2,
      isFree: false,
      videoUrl: 'https://www.youtube.com/watch?v=ahCwqrYpIuM',
      videoId: 'ahCwqrYpIuM', // TypeScript basics
    },
    // Course 1 - Chapter 2
    {
      id: IDS.c1l4,
      chapterId: IDS.c1ch2,
      title: 'Primitive Types',
      type: LessonType.VIDEO,
      duration: 1500,
      position: 0,
      isFree: false,
      videoUrl: 'https://www.youtube.com/watch?v=WlxcujsvcIY',
      videoId: 'WlxcujsvcIY', // TypeScript types
    },
    {
      id: IDS.c1l5,
      chapterId: IDS.c1ch2,
      title: 'Arrays and Objects',
      type: LessonType.VIDEO,
      duration: 1800,
      position: 1,
      isFree: false,
      videoUrl: 'https://www.youtube.com/watch?v=1oVyLeRR6Bk',
      videoId: '1oVyLeRR6Bk', // Arrays & Objects in TS
    },
    {
      id: IDS.c1quiz1,
      chapterId: IDS.c1ch2,
      title: 'Quiz: Type System Basics',
      type: LessonType.QUIZ,
      duration: 600,
      position: 2,
      isFree: false,
    },
    // Course 1 - Chapter 3
    {
      id: IDS.c1l6,
      chapterId: IDS.c1ch3,
      title: 'Introduction to Generics',
      type: LessonType.VIDEO,
      duration: 2400,
      position: 0,
      isFree: false,
      videoUrl: 'https://www.youtube.com/watch?v=nViEqpgwxHE',
      videoId: 'nViEqpgwxHE', // TypeScript Generics
    },
    {
      id: IDS.c1quiz2,
      chapterId: IDS.c1ch3,
      title: 'Final Quiz: Advanced TypeScript',
      type: LessonType.QUIZ,
      duration: 900,
      position: 1,
      isFree: false,
    },
    // Course 2 - Chapter 1 - Vue 3 Composition API videos
    {
      id: IDS.c2l1,
      chapterId: IDS.c2ch1,
      title: 'Introduction to Composition API',
      type: LessonType.VIDEO,
      duration: 1200,
      position: 0,
      isFree: true,
      videoUrl: 'https://www.youtube.com/watch?v=bwItFdPt-6M',
      videoId: 'bwItFdPt-6M', // Vue 3 Composition API
    },
    {
      id: IDS.c2l2,
      chapterId: IDS.c2ch1,
      title: 'ref vs reactive',
      type: LessonType.VIDEO,
      duration: 1800,
      position: 1,
      isFree: false,
      videoUrl: 'https://www.youtube.com/watch?v=sAj6tdVS2cA',
      videoId: 'sAj6tdVS2cA', // ref vs reactive explained
    },
    // Course 2 - Chapter 2
    {
      id: IDS.c2l3,
      chapterId: IDS.c2ch2,
      title: 'Creating Your First Composable',
      type: LessonType.VIDEO,
      duration: 2100,
      position: 0,
      isFree: false,
      videoUrl: 'https://www.youtube.com/watch?v=4aIvWMp-dkE',
      videoId: '4aIvWMp-dkE', // Vue Composables
    },
    {
      id: IDS.c2quiz1,
      chapterId: IDS.c2ch2,
      title: 'Quiz: Composables',
      type: LessonType.QUIZ,
      duration: 600,
      position: 1,
      isFree: false,
    },
  ];

  await Lesson.bulkCreate(lessons);
}

async function seedLessonContent(): Promise<void> {
  logger.info('Seeding lesson content...');

  const contents = [
    {
      id: randomUUID(),
      lessonId: IDS.c1l1,
      lang: SupportedLocale.EN,
      title: 'Why TypeScript?',
      description: 'Discover why TypeScript has become essential for modern web development.',
      videoUrl: 'https://www.youtube.com/watch?v=d56mG7DezGs',
      videoId: 'd56mG7DezGs',
      transcript: 'In this lesson, we explore why TypeScript has become so popular...',
    },
    {
      id: randomUUID(),
      lessonId: IDS.c1l1,
      lang: SupportedLocale.FR,
      title: 'Pourquoi TypeScript ?',
      description: 'Découvrez pourquoi TypeScript est devenu essentiel pour le développement web moderne.',
      videoUrl: 'https://www.youtube.com/watch?v=d56mG7DezGs',
      videoId: 'd56mG7DezGs',
      transcript: 'Dans cette leçon, nous explorons pourquoi TypeScript est devenu si populaire...',
    },
    {
      id: randomUUID(),
      lessonId: IDS.c2l1,
      lang: SupportedLocale.EN,
      title: 'Introduction to Composition API',
      description: 'Learn the fundamentals of Vue 3 Composition API.',
      videoUrl: null,
      videoId: null,
      transcript: 'The Composition API is a new way to organize component logic...',
    },
  ];

  await LessonContent.bulkCreate(contents);
}

async function seedQuizQuestions(): Promise<void> {
  logger.info('Seeding quiz questions...');

  const questions = [
    // Quiz 1 - Type System Basics
    {
      id: randomUUID(),
      lessonId: IDS.c1quiz1,
      question: 'What is the primary purpose of TypeScript?',
      type: QuizQuestionType.SINGLE_CHOICE,
      options: [
        { id: randomUUID(), text: 'To replace JavaScript entirely', isCorrect: false },
        { id: randomUUID(), text: 'To add static type checking to JavaScript', isCorrect: true },
        { id: randomUUID(), text: 'To make JavaScript run faster', isCorrect: false },
        { id: randomUUID(), text: 'To compile JavaScript to machine code', isCorrect: false },
      ],
      points: 10,
      position: 0,
    },
    {
      id: randomUUID(),
      lessonId: IDS.c1quiz1,
      question: 'Which of the following are valid TypeScript primitive types? (Select all that apply)',
      type: QuizQuestionType.MULTIPLE_CHOICE,
      options: [
        { id: randomUUID(), text: 'string', isCorrect: true },
        { id: randomUUID(), text: 'number', isCorrect: true },
        { id: randomUUID(), text: 'boolean', isCorrect: true },
        { id: randomUUID(), text: 'integer', isCorrect: false },
      ],
      points: 15,
      position: 1,
    },
    {
      id: randomUUID(),
      lessonId: IDS.c1quiz1,
      question: 'TypeScript code is compiled directly to machine code.',
      type: QuizQuestionType.TRUE_FALSE,
      options: [
        { id: randomUUID(), text: 'True', isCorrect: false },
        { id: randomUUID(), text: 'False', isCorrect: true },
      ],
      points: 5,
      position: 2,
    },
    {
      id: randomUUID(),
      lessonId: IDS.c1quiz1,
      question: 'What keyword is used to define an interface in TypeScript?',
      type: QuizQuestionType.SINGLE_CHOICE,
      options: [
        { id: randomUUID(), text: 'type', isCorrect: false },
        { id: randomUUID(), text: 'interface', isCorrect: true },
        { id: randomUUID(), text: 'class', isCorrect: false },
        { id: randomUUID(), text: 'struct', isCorrect: false },
      ],
      points: 10,
      position: 3,
    },
    // Quiz 2 - Advanced TypeScript
    {
      id: randomUUID(),
      lessonId: IDS.c1quiz2,
      question: 'What is a generic in TypeScript?',
      type: QuizQuestionType.SINGLE_CHOICE,
      options: [
        { id: randomUUID(), text: 'A type that can work with any data type', isCorrect: true },
        { id: randomUUID(), text: 'A default export from a module', isCorrect: false },
        { id: randomUUID(), text: 'A special function type', isCorrect: false },
        { id: randomUUID(), text: 'An alternative to interfaces', isCorrect: false },
      ],
      points: 10,
      position: 0,
    },
    {
      id: randomUUID(),
      lessonId: IDS.c1quiz2,
      question: 'Which utility types does TypeScript provide? (Select all that apply)',
      type: QuizQuestionType.MULTIPLE_CHOICE,
      options: [
        { id: randomUUID(), text: 'Partial<T>', isCorrect: true },
        { id: randomUUID(), text: 'Required<T>', isCorrect: true },
        { id: randomUUID(), text: 'Optional<T>', isCorrect: false },
        { id: randomUUID(), text: 'Pick<T, K>', isCorrect: true },
      ],
      points: 15,
      position: 1,
    },
    // Vue Quiz
    {
      id: randomUUID(),
      lessonId: IDS.c2quiz1,
      question: 'What is the difference between ref and reactive in Vue 3?',
      type: QuizQuestionType.SINGLE_CHOICE,
      options: [
        { id: randomUUID(), text: 'ref is for primitives, reactive is for objects', isCorrect: true },
        { id: randomUUID(), text: 'They are exactly the same', isCorrect: false },
        { id: randomUUID(), text: 'reactive is deprecated', isCorrect: false },
        { id: randomUUID(), text: 'ref cannot be used with objects', isCorrect: false },
      ],
      points: 10,
      position: 0,
    },
    {
      id: randomUUID(),
      lessonId: IDS.c2quiz1,
      question: 'A composable is a function that uses Composition API features.',
      type: QuizQuestionType.TRUE_FALSE,
      options: [
        { id: randomUUID(), text: 'True', isCorrect: true },
        { id: randomUUID(), text: 'False', isCorrect: false },
      ],
      points: 5,
      position: 1,
    },
  ];

  await QuizQuestion.bulkCreate(questions);
}

async function seedBadges(): Promise<void> {
  logger.info('Seeding badges...');

  const badges: Array<{
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    criteria: BadgeCriteria;
  }> = [
    {
      id: IDS.badge1,
      name: 'First Steps',
      description: 'Complete your first lesson',
      imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=first-steps',
      criteria: { type: 'lessons_completed', threshold: 1, description: 'Complete 1 lesson' },
    },
    {
      id: IDS.badge2,
      name: 'TypeScript Master',
      description: 'Complete the TypeScript course',
      imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=typescript',
      criteria: { type: 'course_completion', courseId: IDS.course1, description: 'Complete the TypeScript course' },
    },
    {
      id: IDS.badge3,
      name: 'Quiz Champion',
      description: 'Pass 5 quizzes with a score of 80% or higher',
      imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=quiz-champion',
      criteria: { type: 'quiz_score', threshold: 80, description: 'Score 80% or higher on 5 quizzes' },
    },
  ];

  await Badge.bulkCreate(badges);
}

async function seedPurchasesAndProgress(): Promise<void> {
  logger.info('Seeding purchases and progress...');

  // Create purchases for learner1, soloLearner, and instructor (for demo)
  await Purchase.bulkCreate([
    {
      id: randomUUID(),
      userId: IDS.learner1,
      courseId: IDS.course1,
      tenantId: IDS.tenant,
      amount: 49.99,
      status: PurchaseStatus.COMPLETED,
    },
    {
      id: randomUUID(),
      userId: IDS.learner1,
      courseId: IDS.course2,
      tenantId: IDS.tenant,
      amount: 79.99,
      status: PurchaseStatus.COMPLETED,
    },
    {
      id: randomUUID(),
      userId: IDS.soloLearner,
      courseId: IDS.course1,
      tenantId: null,
      amount: 49.99,
      status: PurchaseStatus.COMPLETED,
    },
    // Instructor enrolled in both courses (for demo presentation)
    {
      id: randomUUID(),
      userId: IDS.instructor,
      courseId: IDS.course1,
      tenantId: null,
      amount: 0, // Free for instructor
      status: PurchaseStatus.COMPLETED,
    },
    {
      id: randomUUID(),
      userId: IDS.instructor,
      courseId: IDS.course2,
      tenantId: null,
      amount: 0,
      status: PurchaseStatus.COMPLETED,
    },
  ]);

  // Create progress - learner1 has completed some lessons in course 1
  await UserProgress.bulkCreate([
    {
      id: randomUUID(),
      userId: IDS.learner1,
      courseId: IDS.course1,
      lessonId: IDS.c1l1,
      completed: true,
      completedAt: new Date(),
    },
    {
      id: randomUUID(),
      userId: IDS.learner1,
      courseId: IDS.course1,
      lessonId: IDS.c1l2,
      completed: true,
      completedAt: new Date(),
    },
    {
      id: randomUUID(),
      userId: IDS.learner1,
      courseId: IDS.course1,
      lessonId: IDS.c1l3,
      completed: true,
      completedAt: new Date(),
    },
    {
      id: randomUUID(),
      userId: IDS.learner1,
      courseId: IDS.course2,
      lessonId: IDS.c2l1,
      completed: true,
      completedAt: new Date(),
    },
    // Instructor progress (for demo)
    {
      id: randomUUID(),
      userId: IDS.instructor,
      courseId: IDS.course1,
      lessonId: IDS.c1l1,
      completed: true,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      id: randomUUID(),
      userId: IDS.instructor,
      courseId: IDS.course1,
      lessonId: IDS.c1l2,
      completed: true,
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      id: randomUUID(),
      userId: IDS.instructor,
      courseId: IDS.course2,
      lessonId: IDS.c2l1,
      completed: true,
      completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    },
  ]);

  // Award badges to learner1 and instructor
  await UserBadge.bulkCreate([
    {
      id: randomUUID(),
      userId: IDS.learner1,
      badgeId: IDS.badge1,
      courseId: IDS.course1,
      earnedAt: new Date(),
    },
    // Instructor badge (for demo)
    {
      id: randomUUID(),
      userId: IDS.instructor,
      badgeId: IDS.badge1,
      courseId: IDS.course1,
      earnedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  ]);
}

// =============================================================================
// Main Execution
// =============================================================================

async function runSeed(): Promise<void> {
  logger.info('Starting database seed...');
  logger.info({ defaultPassword: DEFAULT_PASSWORD }, 'Default password for all users');

  try {
    // Connect and setup associations
    await sequelize.authenticate();
    setupAssociations();

    // Add currency column if it doesn't exist (manual migration for new field)
    logger.info('Ensuring database schema has currency column...');
    try {
      await sequelize.query(`
        ALTER TABLE courses
        ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'EUR'
      `);
      logger.info('Currency column ensured');
    } catch {
      // Column might already exist with different attributes, that's OK
      logger.info('Currency column already exists or could not be added');
    }

    logger.info('Clearing existing data...');

    // Use a transaction for clearing data with deferred constraints
    await sequelize.transaction(async (t) => {
      // Disable foreign key checks temporarily within transaction
      await sequelize.query('SET CONSTRAINTS ALL DEFERRED', { transaction: t });

      // Clear tables in reverse dependency order
      await UserBadge.destroy({ where: {}, force: true, transaction: t });
      await UserProgress.destroy({ where: {}, force: true, transaction: t });
      await Purchase.destroy({ where: {}, force: true, transaction: t });
      await QuizQuestion.destroy({ where: {}, force: true, transaction: t });
      await LessonContent.destroy({ where: {}, force: true, transaction: t });
      await Lesson.destroy({ where: {}, force: true, transaction: t });
      await Chapter.destroy({ where: {}, force: true, transaction: t });
      await Course.destroy({ where: {}, force: true, transaction: t });
      await Badge.destroy({ where: {}, force: true, transaction: t });
      await User.destroy({ where: {}, force: true, transaction: t });
      await Tenant.destroy({ where: {}, force: true, transaction: t });
    });

    logger.info('Existing data cleared, seeding new data...');

    // Run seeders
    await seedTenants();
    await seedUsers();
    await seedBadges();
    await seedCourses();
    await seedChaptersAndLessons();
    await seedLessonContent();
    await seedQuizQuestions();
    await seedPurchasesAndProgress();

    logger.info('Seed completed successfully!');
    logger.info({
      testAccounts: [
        'superadmin@lms.local (Super Admin)',
        'instructor@lms.local (Instructor)',
        'admin@acme-corp.com (Tenant Admin)',
        'learner1@acme-corp.com (Learner with progress)',
        'solo@example.com (B2C Learner)',
      ],
      password: DEFAULT_PASSWORD,
    }, 'Test accounts created');
  } catch (error) {
    logger.error({ error }, 'Seed failed');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if executed directly
runSeed();

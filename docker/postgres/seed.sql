-- =============================================================================
-- LMS Database Seed Script
-- =============================================================================
-- Default password for all users: Password123!
-- Password hash (bcrypt): $2b$10$8K1p/L0UnC8fJ7UqB.1yZu7qhF8LqFWZR0Kl2h1gM8g.xKrXJPLbu

BEGIN;

-- =============================================================================
-- TENANTS
-- =============================================================================
INSERT INTO tenants (id, name, slug, status, isolation_strategy, seats_purchased, seats_used, subscription_status, created_at, updated_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Acme Corporation', 'acme-corp', 'active'::tenant_status, 'SHARED'::isolation_strategy, 10, 4, 'active'::subscription_status, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'Tech Startup Inc', 'tech-startup', 'trial'::tenant_status, 'SHARED'::isolation_strategy, 5, 2, 'trialing'::subscription_status, NOW(), NOW());

-- =============================================================================
-- USERS
-- =============================================================================
-- Password for all: Password123!
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, tenant_id, created_at, updated_at)
VALUES
  -- SuperAdmin (global, no tenant)
  ('550e8400-e29b-41d4-a716-446655440100', 'superadmin@lms.local', '$2b$10$8K1p/L0UnC8fJ7UqB.1yZu7qhF8LqFWZR0Kl2h1gM8g.xKrXJPLbu', 'Super', 'Admin', 'super_admin'::user_role, 'active'::user_status, NULL, NOW(), NOW()),

  -- Instructor (global, creates courses)
  ('550e8400-e29b-41d4-a716-446655440101', 'instructor@lms.local', '$2b$10$8K1p/L0UnC8fJ7UqB.1yZu7qhF8LqFWZR0Kl2h1gM8g.xKrXJPLbu', 'Ian', 'Instructor', 'instructor'::user_role, 'active'::user_status, NULL, NOW(), NOW()),

  -- Solo learner (B2C, no tenant)
  ('550e8400-e29b-41d4-a716-446655440102', 'solo@example.com', '$2b$10$8K1p/L0UnC8fJ7UqB.1yZu7qhF8LqFWZR0Kl2h1gM8g.xKrXJPLbu', 'Solo', 'Learner', 'learner'::user_role, 'active'::user_status, NULL, NOW(), NOW()),

  -- Acme Corp users
  ('550e8400-e29b-41d4-a716-446655440201', 'admin@acme-corp.com', '$2b$10$8K1p/L0UnC8fJ7UqB.1yZu7qhF8LqFWZR0Kl2h1gM8g.xKrXJPLbu', 'Alice', 'Admin', 'tenant_admin'::user_role, 'active'::user_status, '550e8400-e29b-41d4-a716-446655440001', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440202', 'manager@acme-corp.com', '$2b$10$8K1p/L0UnC8fJ7UqB.1yZu7qhF8LqFWZR0Kl2h1gM8g.xKrXJPLbu', 'Mike', 'Manager', 'manager'::user_role, 'active'::user_status, '550e8400-e29b-41d4-a716-446655440001', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440203', 'learner1@acme-corp.com', '$2b$10$8K1p/L0UnC8fJ7UqB.1yZu7qhF8LqFWZR0Kl2h1gM8g.xKrXJPLbu', 'Laura', 'Learner', 'learner'::user_role, 'active'::user_status, '550e8400-e29b-41d4-a716-446655440001', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440204', 'learner2@acme-corp.com', '$2b$10$8K1p/L0UnC8fJ7UqB.1yZu7qhF8LqFWZR0Kl2h1gM8g.xKrXJPLbu', 'Leo', 'Student', 'learner'::user_role, 'active'::user_status, '550e8400-e29b-41d4-a716-446655440001', NOW(), NOW()),

  -- Tech Startup users
  ('550e8400-e29b-41d4-a716-446655440301', 'admin@tech-startup.com', '$2b$10$8K1p/L0UnC8fJ7UqB.1yZu7qhF8LqFWZR0Kl2h1gM8g.xKrXJPLbu', 'Tom', 'TechAdmin', 'tenant_admin'::user_role, 'active'::user_status, '550e8400-e29b-41d4-a716-446655440002', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440302', 'dev@tech-startup.com', '$2b$10$8K1p/L0UnC8fJ7UqB.1yZu7qhF8LqFWZR0Kl2h1gM8g.xKrXJPLbu', 'Diana', 'Developer', 'learner'::user_role, 'active'::user_status, '550e8400-e29b-41d4-a716-446655440002', NOW(), NOW());

-- =============================================================================
-- GROUPS
-- =============================================================================
INSERT INTO groups (id, tenant_id, name, description, created_at, updated_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440001', 'Engineering Team', 'Software engineers and developers', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440001', 'Sales Team', 'Sales and business development', NOW(), NOW());

-- =============================================================================
-- USER_GROUPS (Many-to-Many)
-- =============================================================================
INSERT INTO user_groups (user_id, group_id)
VALUES
  ('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440401'),
  ('550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440401');

-- =============================================================================
-- COURSES
-- =============================================================================
INSERT INTO courses (id, title, slug, description, status, price, instructor_id, duration, chapters_count, lessons_count, created_at, updated_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440501', 'Introduction to TypeScript', 'intro-typescript', 'Learn the fundamentals of TypeScript, from basic types to advanced patterns. Perfect for JavaScript developers looking to level up.', 'published'::course_status, 49.99, '550e8400-e29b-41d4-a716-446655440101', 7200, 3, 9, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440502', 'Advanced Vue.js Patterns', 'advanced-vue-patterns', 'Master advanced Vue.js concepts including Composition API, state management, and testing strategies.', 'published'::course_status, 79.99, '550e8400-e29b-41d4-a716-446655440101', 10800, 3, 8, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440503', 'Node.js Backend Development', 'nodejs-backend', 'Build scalable backend applications with Node.js, Express, and PostgreSQL.', 'draft'::course_status, 99.99, '550e8400-e29b-41d4-a716-446655440101', 14400, 0, 0, NOW(), NOW());

-- =============================================================================
-- CHAPTERS
-- =============================================================================
INSERT INTO chapters (id, course_id, title, description, position, created_at, updated_at)
VALUES
  -- TypeScript course chapters
  ('550e8400-e29b-41d4-a716-446655440601', '550e8400-e29b-41d4-a716-446655440501', 'Getting Started', 'Setup your development environment and learn TypeScript basics', 0, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440501', 'Type System Deep Dive', 'Understanding TypeScript''s powerful type system', 1, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440603', '550e8400-e29b-41d4-a716-446655440501', 'Advanced Types', 'Generics, utility types, and conditional types', 2, NOW(), NOW()),

  -- Vue.js course chapters
  ('550e8400-e29b-41d4-a716-446655440611', '550e8400-e29b-41d4-a716-446655440502', 'Composition API Mastery', 'Deep dive into Vue 3 Composition API', 0, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440612', '550e8400-e29b-41d4-a716-446655440502', 'State Management with Pinia', 'Modern state management patterns', 1, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440613', '550e8400-e29b-41d4-a716-446655440502', 'Testing Vue Applications', 'Unit and E2E testing strategies', 2, NOW(), NOW());

-- =============================================================================
-- LESSONS
-- =============================================================================
INSERT INTO lessons (id, chapter_id, title, type, duration, position, is_free, requires_previous, created_at, updated_at)
VALUES
  -- TypeScript Chapter 1 lessons
  ('550e8400-e29b-41d4-a716-446655440701', '550e8400-e29b-41d4-a716-446655440601', 'Welcome to TypeScript', 'video'::lesson_type, 300, 0, true, false, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440702', '550e8400-e29b-41d4-a716-446655440601', 'Setting Up Your Environment', 'video'::lesson_type, 600, 1, true, true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440703', '550e8400-e29b-41d4-a716-446655440601', 'Chapter 1 Quiz', 'quiz'::lesson_type, 300, 2, false, true, NOW(), NOW()),

  -- TypeScript Chapter 2 lessons
  ('550e8400-e29b-41d4-a716-446655440704', '550e8400-e29b-41d4-a716-446655440602', 'Basic Types', 'video'::lesson_type, 900, 0, false, true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440705', '550e8400-e29b-41d4-a716-446655440602', 'Interfaces and Type Aliases', 'video'::lesson_type, 1200, 1, false, true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440706', '550e8400-e29b-41d4-a716-446655440602', 'Chapter 2 Quiz', 'quiz'::lesson_type, 300, 2, false, true, NOW(), NOW()),

  -- TypeScript Chapter 3 lessons
  ('550e8400-e29b-41d4-a716-446655440707', '550e8400-e29b-41d4-a716-446655440603', 'Generics', 'video'::lesson_type, 1500, 0, false, true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440708', '550e8400-e29b-41d4-a716-446655440603', 'Utility Types', 'video'::lesson_type, 1200, 1, false, true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440709', '550e8400-e29b-41d4-a716-446655440603', 'Final Assessment', 'quiz'::lesson_type, 600, 2, false, true, NOW(), NOW()),

  -- Vue.js Chapter 1 lessons
  ('550e8400-e29b-41d4-a716-446655440711', '550e8400-e29b-41d4-a716-446655440611', 'Introduction to Composition API', 'video'::lesson_type, 600, 0, true, false, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440712', '550e8400-e29b-41d4-a716-446655440611', 'Reactivity in Depth', 'video'::lesson_type, 1200, 1, false, true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440713', '550e8400-e29b-41d4-a716-446655440611', 'Composables Pattern', 'video'::lesson_type, 900, 2, false, true, NOW(), NOW());

-- =============================================================================
-- QUIZ QUESTIONS (for quiz lessons)
-- =============================================================================
INSERT INTO quiz_questions (id, lesson_id, question, type, options, points, position, created_at, updated_at)
VALUES
  -- Chapter 1 Quiz questions
  ('550e8400-e29b-41d4-a716-446655440801', '550e8400-e29b-41d4-a716-446655440703', 'What is TypeScript?', 'single_choice'::quiz_question_type, '[{"id":"a","text":"A JavaScript framework","isCorrect":false},{"id":"b","text":"A typed superset of JavaScript","isCorrect":true},{"id":"c","text":"A database","isCorrect":false},{"id":"d","text":"A CSS preprocessor","isCorrect":false}]', 10, 0, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440802', '550e8400-e29b-41d4-a716-446655440703', 'TypeScript code compiles to what?', 'single_choice'::quiz_question_type, '[{"id":"a","text":"Python","isCorrect":false},{"id":"b","text":"Java","isCorrect":false},{"id":"c","text":"JavaScript","isCorrect":true},{"id":"d","text":"C++","isCorrect":false}]', 10, 1, NOW(), NOW()),

  -- Chapter 2 Quiz questions
  ('550e8400-e29b-41d4-a716-446655440803', '550e8400-e29b-41d4-a716-446655440706', 'Which is NOT a basic TypeScript type?', 'single_choice'::quiz_question_type, '[{"id":"a","text":"string","isCorrect":false},{"id":"b","text":"number","isCorrect":false},{"id":"c","text":"integer","isCorrect":true},{"id":"d","text":"boolean","isCorrect":false}]', 10, 0, NOW(), NOW());

-- =============================================================================
-- PURCHASES (sample purchases for testing)
-- =============================================================================
INSERT INTO purchases (id, user_id, course_id, tenant_id, amount, currency, status, purchased_at, created_at, updated_at)
VALUES
  -- Solo learner purchased TypeScript course
  ('550e8400-e29b-41d4-a716-446655440901', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440501', NULL, 49.99, 'EUR', 'completed'::purchase_status, NOW(), NOW(), NOW()),
  -- Acme Corp bulk purchase
  ('550e8400-e29b-41d4-a716-446655440902', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440001', 199.96, 'EUR', 'completed'::purchase_status, NOW(), NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440903', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440001', 319.96, 'EUR', 'completed'::purchase_status, NOW(), NOW(), NOW());

-- =============================================================================
-- BADGES
-- =============================================================================
INSERT INTO badges (id, name, description, image_url, criteria, created_at, updated_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440a01', 'TypeScript Beginner', 'Completed Introduction to TypeScript', 'https://api.dicebear.com/7.x/shapes/svg?seed=ts-beginner', '{"type":"course_completion","courseId":"550e8400-e29b-41d4-a716-446655440501"}', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440a02', 'Vue Master', 'Completed Advanced Vue.js Patterns', 'https://api.dicebear.com/7.x/shapes/svg?seed=vue-master', '{"type":"course_completion","courseId":"550e8400-e29b-41d4-a716-446655440502"}', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440a03', 'Quiz Champion', 'Scored 100% on 5 quizzes', 'https://api.dicebear.com/7.x/shapes/svg?seed=quiz-champion', '{"type":"quiz_streak","count":5,"minScore":100}', NOW(), NOW());

COMMIT;

-- =============================================================================
-- Summary
-- =============================================================================
-- Tenants: 2 (Acme Corp, Tech Startup)
-- Users: 9 (1 superadmin, 1 instructor, 1 solo, 6 tenant users)
-- Groups: 2
-- Courses: 3 (2 published, 1 draft)
-- Chapters: 6
-- Lessons: 12
-- Quiz Questions: 3
-- Purchases: 3
-- Badges: 3
--
-- Test credentials:
-- - superadmin@lms.local / Password123!
-- - instructor@lms.local / Password123!
-- - solo@example.com / Password123!
-- - admin@acme-corp.com / Password123!
-- =============================================================================

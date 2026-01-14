/**
 * Database Seeding Script
 *
 * Creates initial data for development and testing:
 * - SuperAdmin user
 * - Test tenant with seats
 * - Test users (admin, manager, instructor, learners)
 * - Sample courses with chapters and lessons
 *
 * Usage: npx ts-node apps/api/src/database/seed.ts
 */

import { randomUUID } from 'crypto';
import { hash } from 'bcrypt';

// Seed data configuration
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Password123!';

// =============================================================================
// Data Definitions
// =============================================================================

interface SeedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  tenantId: string | null;
}

interface SeedTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  seatsPurchased: number;
  seatsUsed: number;
  subscriptionStatus: string;
}

interface SeedCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  price: number;
  instructorId: string;
  duration: number;
}

// =============================================================================
// Seed Data
// =============================================================================

const superAdminId = randomUUID();
const testTenantId = randomUUID();
const tenantAdminId = randomUUID();
const managerId = randomUUID();
const instructorId = randomUUID();
const learner1Id = randomUUID();
const learner2Id = randomUUID();
const soloLearnerId = randomUUID();

const course1Id = randomUUID();
const course2Id = randomUUID();

export const seedTenants: SeedTenant[] = [
  {
    id: testTenantId,
    name: 'Acme Corporation',
    slug: 'acme-corp',
    status: 'active',
    seatsPurchased: 10,
    seatsUsed: 4,
    subscriptionStatus: 'active',
  },
];

export const seedUsers: SeedUser[] = [
  // SuperAdmin (no tenant)
  {
    id: superAdminId,
    email: 'superadmin@lms.local',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'super_admin',
    status: 'active',
    tenantId: null,
  },
  // Solo learner (B2C, no tenant)
  {
    id: soloLearnerId,
    email: 'solo@example.com',
    firstName: 'Solo',
    lastName: 'Learner',
    role: 'learner',
    status: 'active',
    tenantId: null,
  },
  // Tenant Admin
  {
    id: tenantAdminId,
    email: 'admin@acme-corp.com',
    firstName: 'Alice',
    lastName: 'Admin',
    role: 'tenant_admin',
    status: 'active',
    tenantId: testTenantId,
  },
  // Manager
  {
    id: managerId,
    email: 'manager@acme-corp.com',
    firstName: 'Mike',
    lastName: 'Manager',
    role: 'manager',
    status: 'active',
    tenantId: testTenantId,
  },
  // Instructor
  {
    id: instructorId,
    email: 'instructor@lms.local',
    firstName: 'Ian',
    lastName: 'Instructor',
    role: 'instructor',
    status: 'active',
    tenantId: null,
  },
  // Learners in tenant
  {
    id: learner1Id,
    email: 'learner1@acme-corp.com',
    firstName: 'Laura',
    lastName: 'Learner',
    role: 'learner',
    status: 'active',
    tenantId: testTenantId,
  },
  {
    id: learner2Id,
    email: 'learner2@acme-corp.com',
    firstName: 'Leo',
    lastName: 'Student',
    role: 'learner',
    status: 'active',
    tenantId: testTenantId,
  },
];

export const seedCourses: SeedCourse[] = [
  {
    id: course1Id,
    title: 'Introduction to TypeScript',
    slug: 'intro-typescript',
    description:
      'Learn the fundamentals of TypeScript, from basic types to advanced patterns.',
    status: 'published',
    price: 49.99,
    instructorId: instructorId,
    duration: 7200, // 2 hours
  },
  {
    id: course2Id,
    title: 'Advanced Vue.js Patterns',
    slug: 'advanced-vue-patterns',
    description:
      'Master advanced Vue.js concepts including Composition API, state management, and testing.',
    status: 'published',
    price: 79.99,
    instructorId: instructorId,
    duration: 10800, // 3 hours
  },
];

export const seedChapters = [
  // Course 1 chapters
  {
    id: randomUUID(),
    courseId: course1Id,
    title: 'Getting Started with TypeScript',
    description: 'Setup and basic concepts',
    position: 0,
  },
  {
    id: randomUUID(),
    courseId: course1Id,
    title: 'Type System Deep Dive',
    description: 'Understanding TypeScript types',
    position: 1,
  },
  {
    id: randomUUID(),
    courseId: course1Id,
    title: 'Advanced Types',
    description: 'Generics, utility types, and more',
    position: 2,
  },
  // Course 2 chapters
  {
    id: randomUUID(),
    courseId: course2Id,
    title: 'Composition API Mastery',
    description: 'Deep dive into Vue 3 Composition API',
    position: 0,
  },
  {
    id: randomUUID(),
    courseId: course2Id,
    title: 'State Management',
    description: 'Pinia and advanced state patterns',
    position: 1,
  },
];

// =============================================================================
// SQL Generation Functions
// =============================================================================

export async function generateSeedSQL(): Promise<string> {
  const passwordHash = await hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  const now = new Date().toISOString();

  const sql: string[] = [
    '-- LMS Database Seed Script',
    '-- Generated: ' + now,
    '-- Default password for all users: ' + DEFAULT_PASSWORD,
    '',
    'BEGIN;',
    '',
    '-- Clear existing data (in correct order for foreign keys)',
    'TRUNCATE TABLE user_badges CASCADE;',
    'TRUNCATE TABLE quiz_results CASCADE;',
    'TRUNCATE TABLE user_progress CASCADE;',
    'TRUNCATE TABLE purchases CASCADE;',
    'TRUNCATE TABLE quiz_questions CASCADE;',
    'TRUNCATE TABLE lessons CASCADE;',
    'TRUNCATE TABLE chapters CASCADE;',
    'TRUNCATE TABLE courses CASCADE;',
    'TRUNCATE TABLE user_groups CASCADE;',
    'TRUNCATE TABLE groups CASCADE;',
    'TRUNCATE TABLE users CASCADE;',
    'TRUNCATE TABLE tenants CASCADE;',
    '',
    '-- Insert tenants',
  ];

  for (const tenant of seedTenants) {
    sql.push(`INSERT INTO tenants (id, name, slug, status, seats_purchased, seats_used, subscription_status, created_at, updated_at)
VALUES ('${tenant.id}', '${tenant.name}', '${tenant.slug}', '${tenant.status}'::tenant_status, ${tenant.seatsPurchased}, ${tenant.seatsUsed}, '${tenant.subscriptionStatus}'::subscription_status, '${now}', '${now}');`);
  }

  sql.push('', '-- Insert users');

  for (const user of seedUsers) {
    const tenantValue = user.tenantId ? `'${user.tenantId}'` : 'NULL';
    sql.push(`INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, tenant_id, created_at, updated_at)
VALUES ('${user.id}', '${user.email}', '${passwordHash}', '${user.firstName}', '${user.lastName}', '${user.role}'::user_role, '${user.status}'::user_status, ${tenantValue}, '${now}', '${now}');`);
  }

  sql.push('', '-- Insert courses');

  for (const course of seedCourses) {
    sql.push(`INSERT INTO courses (id, title, slug, description, status, price, instructor_id, duration, chapters_count, lessons_count, created_at, updated_at)
VALUES ('${course.id}', '${course.title}', '${course.slug}', '${course.description}', '${course.status}'::course_status, ${course.price}, '${course.instructorId}', ${course.duration}, 0, 0, '${now}', '${now}');`);
  }

  sql.push('', '-- Insert chapters');

  for (const chapter of seedChapters) {
    sql.push(`INSERT INTO chapters (id, course_id, title, description, position, created_at, updated_at)
VALUES ('${chapter.id}', '${chapter.courseId}', '${chapter.title}', '${chapter.description}', ${chapter.position}, '${now}', '${now}');`);
  }

  sql.push('', '-- Update course chapter counts');
  sql.push(`UPDATE courses SET chapters_count = (SELECT COUNT(*) FROM chapters WHERE chapters.course_id = courses.id);`);

  sql.push('', 'COMMIT;');
  sql.push('', '-- Seed completed successfully!');

  return sql.join('\n');
}

// =============================================================================
// Main execution
// =============================================================================

async function main() {
  console.log('Generating seed SQL...');
  const sql = await generateSeedSQL();
  console.log(sql);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

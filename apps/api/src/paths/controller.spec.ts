import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { CourseStatus } from '../database/models/enums.js';

// Valid UUIDs for schema validation
const UUID1 = '00000000-0000-4000-8000-000000000001';
const UUID2 = '00000000-0000-4000-8000-000000000002';
const UUID3 = '00000000-0000-4000-8000-000000000003';
const UUID_COURSE = '11111111-1111-4111-8111-111111111111';
const UUID_PATH = '22222222-2222-4222-8222-222222222222';

// =============================================================================
// Module Mocks — inline to avoid hoisting issues
// =============================================================================

vi.mock('../database/models/CoursePath.js', () => ({
  CoursePath: {
    findAndCountAll: vi.fn(),
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../database/models/CoursePathItem.js', () => ({
  CoursePathItem: {
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../database/models/CoursePrerequisite.js', () => ({
  CoursePrerequisite: {
    findAll: vi.fn(),
    destroy: vi.fn(),
    bulkCreate: vi.fn(),
  },
}));

vi.mock('../database/models/Course.js', () => ({
  Course: {
    findByPk: vi.fn(),
    findAll: vi.fn(),
  },
}));

vi.mock('../database/models/User.js', () => ({
  User: {},
}));

vi.mock('../database/models/UserProgress.js', () => ({
  UserProgress: {
    count: vi.fn(),
  },
}));

vi.mock('../database/models/enums.js', async () => {
  const actual = await vi.importActual('../database/models/enums.js');
  return actual;
});

vi.mock('sequelize', () => ({
  Op: {
    or: Symbol('or'),
    in: Symbol('in'),
  },
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import {
  listPaths,
  getPath,
  createPath,
  updatePath,
  deletePath,
  addCourseToPath,
  removeCourseFromPath,
  reorderPathCourses,
  getPathProgress,
  getPrerequisites,
  setPrerequisites,
  checkPrerequisitesMet,
} from './controller.js';
import { CoursePath } from '../database/models/CoursePath.js';
import { CoursePathItem } from '../database/models/CoursePathItem.js';
import { CoursePrerequisite } from '../database/models/CoursePrerequisite.js';
import { Course } from '../database/models/Course.js';
import { UserProgress } from '../database/models/UserProgress.js';

// =============================================================================
// Helpers
// =============================================================================

function createMockContext(options: {
  body?: unknown;
  params?: Record<string, string>;
  state?: Record<string, unknown>;
  query?: Record<string, string>;
} = {}): Context {
  return {
    params: options.params || {},
    query: options.query || {},
    request: { body: options.body || {} },
    state: options.state || {
      user: { userId: 'user-123' },
    },
    status: 200,
    body: null,
  } as unknown as Context;
}

// =============================================================================
// Tests
// =============================================================================

describe('Paths Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Path CRUD
  // ===========================================================================

  describe('listPaths', () => {
    it('should return paginated paths', async () => {
      const mockRows = [
        { id: 'path-1', title: 'Path 1' },
        { id: 'path-2', title: 'Path 2' },
      ];
      vi.mocked(CoursePath.findAndCountAll).mockResolvedValue({ count: 2, rows: mockRows } as never);

      const ctx = createMockContext({ query: { page: '1', limit: '10' } });

      await listPaths(ctx);

      const body = ctx.body as { success: boolean; data: { paths: unknown[]; pagination: { total: number } } };
      expect(body.success).toBe(true);
      expect(body.data.paths).toHaveLength(2);
      expect(body.data.pagination.total).toBe(2);
    });

    it('should filter by status when provided', async () => {
      vi.mocked(CoursePath.findAndCountAll).mockResolvedValue({ count: 0, rows: [] } as never);

      const ctx = createMockContext({
        query: { status: 'published' },
        state: { user: { userId: 'u-1' } },
      });

      await listPaths(ctx);

      expect(CoursePath.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'published' },
        })
      );
    });

    it('should default to published for unauthenticated users', async () => {
      vi.mocked(CoursePath.findAndCountAll).mockResolvedValue({ count: 0, rows: [] } as never);

      const ctx = createMockContext({ state: {} });

      await listPaths(ctx);

      expect(CoursePath.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: CourseStatus.PUBLISHED },
        })
      );
    });

    it('should cap limit at 50', async () => {
      vi.mocked(CoursePath.findAndCountAll).mockResolvedValue({ count: 0, rows: [] } as never);

      const ctx = createMockContext({ query: { limit: '100' } });

      await listPaths(ctx);

      expect(CoursePath.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 })
      );
    });
  });

  describe('getPath', () => {
    it('should return path by ID or slug', async () => {
      const mockPath = { id: 'path-1', title: 'My Path', items: [] };
      vi.mocked(CoursePath.findOne).mockResolvedValue(mockPath as never);

      const ctx = createMockContext({ params: { id: 'my-path' } });

      await getPath(ctx);

      const body = ctx.body as { success: boolean; data: { id: string } };
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('path-1');
    });

    it('should throw 404 when path not found', async () => {
      vi.mocked(CoursePath.findOne).mockResolvedValue(null);

      const ctx = createMockContext({ params: { id: 'nonexistent' } });

      await expect(getPath(ctx)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('createPath', () => {
    it('should create a path with generated slug', async () => {
      vi.mocked(CoursePath.findOne).mockResolvedValue(null); // No slug conflict
      const mockPath = { id: 'path-new', title: 'My New Path', slug: 'my-new-path' };
      vi.mocked(CoursePath.create).mockResolvedValue(mockPath as never);

      const ctx = createMockContext({
        body: { title: 'My New Path', description: 'A great path' },
        state: { user: { userId: 'admin-1' } },
      });

      await createPath(ctx);

      expect(ctx.status).toBe(201);
      expect(CoursePath.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My New Path',
          slug: 'my-new-path',
          createdById: 'admin-1',
        })
      );
    });

    it('should use provided slug when given', async () => {
      vi.mocked(CoursePath.findOne).mockResolvedValue(null);
      vi.mocked(CoursePath.create).mockResolvedValue({ id: 'p-1', slug: 'custom-slug' } as never);

      const ctx = createMockContext({
        body: { title: 'Path', slug: 'custom-slug' },
        state: { user: { userId: 'admin-1' } },
      });

      await createPath(ctx);

      expect(CoursePath.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'custom-slug' })
      );
    });

    it('should throw conflict if slug already exists', async () => {
      vi.mocked(CoursePath.findOne).mockResolvedValue({ id: 'existing-path' } as never);

      const ctx = createMockContext({
        body: { title: 'Duplicate' },
        state: { user: { userId: 'admin-1' } },
      });

      await expect(createPath(ctx)).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('updatePath', () => {
    it('should update path fields', async () => {
      const mockPath = {
        id: 'path-1',
        update: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(CoursePath.findByPk).mockResolvedValue(mockPath as never);

      const ctx = createMockContext({
        params: { id: 'path-1' },
        body: { title: 'Updated Title' },
      });

      await updatePath(ctx);

      expect(mockPath.update).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated Title' })
      );
    });

    it('should throw 404 when path not found', async () => {
      vi.mocked(CoursePath.findByPk).mockResolvedValue(null);

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
        body: { title: 'X' },
      });

      await expect(updatePath(ctx)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('deletePath', () => {
    it('should destroy the path', async () => {
      const mockPath = { id: 'path-1', destroy: vi.fn().mockResolvedValue(undefined) };
      vi.mocked(CoursePath.findByPk).mockResolvedValue(mockPath as never);

      const ctx = createMockContext({ params: { id: 'path-1' } });

      await deletePath(ctx);

      expect(ctx.status).toBe(204);
      expect(mockPath.destroy).toHaveBeenCalled();
    });

    it('should throw 404 when path not found', async () => {
      vi.mocked(CoursePath.findByPk).mockResolvedValue(null);

      const ctx = createMockContext({ params: { id: 'nonexistent' } });

      await expect(deletePath(ctx)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ===========================================================================
  // Path Courses
  // ===========================================================================

  describe('addCourseToPath', () => {
    it('should add a course to the path and update aggregates', async () => {
      const mockPath = {
        id: UUID_PATH,
        coursesCount: 1,
        update: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(CoursePath.findByPk).mockResolvedValue(mockPath as never);
      vi.mocked(Course.findByPk).mockResolvedValue({ id: UUID_COURSE } as never);
      vi.mocked(CoursePathItem.findOne).mockResolvedValue(null);
      vi.mocked(CoursePathItem.create).mockResolvedValue({} as never);
      vi.mocked(CoursePathItem.count).mockResolvedValue(2 as never);
      vi.mocked(CoursePathItem.findAll).mockResolvedValue([
        { course: { duration: 60 } },
        { course: { duration: 90 } },
      ] as never);

      const ctx = createMockContext({
        params: { id: UUID_PATH },
        body: { courseId: UUID_COURSE },
      });

      await addCourseToPath(ctx);

      expect(ctx.status).toBe(201);
      expect(CoursePathItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ pathId: UUID_PATH, courseId: UUID_COURSE })
      );
      expect(mockPath.update).toHaveBeenCalledWith({ coursesCount: 2, estimatedDuration: 150 });
    });

    it('should throw 404 when path not found', async () => {
      vi.mocked(CoursePath.findByPk).mockResolvedValue(null);

      const ctx = createMockContext({
        params: { id: UUID_PATH },
        body: { courseId: UUID_COURSE },
      });

      await expect(addCourseToPath(ctx)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 404 when course not found', async () => {
      vi.mocked(CoursePath.findByPk).mockResolvedValue({ id: UUID_PATH } as never);
      vi.mocked(Course.findByPk).mockResolvedValue(null);

      const ctx = createMockContext({
        params: { id: UUID_PATH },
        body: { courseId: UUID_COURSE },
      });

      await expect(addCourseToPath(ctx)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw conflict when course already in path', async () => {
      vi.mocked(CoursePath.findByPk).mockResolvedValue({ id: UUID_PATH } as never);
      vi.mocked(Course.findByPk).mockResolvedValue({ id: UUID_COURSE } as never);
      vi.mocked(CoursePathItem.findOne).mockResolvedValue({ id: 'existing' } as never);

      const ctx = createMockContext({
        params: { id: UUID_PATH },
        body: { courseId: UUID_COURSE },
      });

      await expect(addCourseToPath(ctx)).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('removeCourseFromPath', () => {
    it('should remove a course and update aggregates', async () => {
      const mockItem = { destroy: vi.fn().mockResolvedValue(undefined) };
      vi.mocked(CoursePathItem.findOne).mockResolvedValue(mockItem as never);
      const mockPath = { update: vi.fn().mockResolvedValue(undefined) };
      vi.mocked(CoursePath.findByPk).mockResolvedValue(mockPath as never);
      vi.mocked(CoursePathItem.count).mockResolvedValue(1 as never);
      vi.mocked(CoursePathItem.findAll).mockResolvedValue([{ course: { duration: 45 } }] as never);

      const ctx = createMockContext({ params: { id: 'p-1', courseId: 'c-1' } });

      await removeCourseFromPath(ctx);

      expect(ctx.status).toBe(204);
      expect(mockItem.destroy).toHaveBeenCalled();
      expect(mockPath.update).toHaveBeenCalledWith({ coursesCount: 1, estimatedDuration: 45 });
    });

    it('should throw 404 when item not found', async () => {
      vi.mocked(CoursePathItem.findOne).mockResolvedValue(null);

      const ctx = createMockContext({ params: { id: 'p-1', courseId: 'c-x' } });

      await expect(removeCourseFromPath(ctx)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('reorderPathCourses', () => {
    it('should update positions for each course', async () => {
      vi.mocked(CoursePath.findByPk).mockResolvedValue({ id: UUID_PATH } as never);
      vi.mocked(CoursePathItem.update).mockResolvedValue([1] as never);

      const ctx = createMockContext({
        params: { id: UUID_PATH },
        body: { order: [UUID2, UUID1, UUID3] },
      });

      await reorderPathCourses(ctx);

      expect(CoursePathItem.update).toHaveBeenCalledTimes(3);
      expect(CoursePathItem.update).toHaveBeenCalledWith(
        { position: 0 },
        { where: { pathId: UUID_PATH, courseId: UUID2 } }
      );
      expect(CoursePathItem.update).toHaveBeenCalledWith(
        { position: 1 },
        { where: { pathId: UUID_PATH, courseId: UUID1 } }
      );
    });

    it('should throw 404 when path not found', async () => {
      vi.mocked(CoursePath.findByPk).mockResolvedValue(null);

      const ctx = createMockContext({
        params: { id: UUID_PATH },
        body: { order: [] },
      });

      await expect(reorderPathCourses(ctx)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ===========================================================================
  // Path Progress
  // ===========================================================================

  describe('getPathProgress', () => {
    it('should compute progress for each course in path', async () => {
      vi.mocked(CoursePath.findByPk).mockResolvedValue({
        id: 'p-1',
        items: [
          { courseId: 'c-1', course: { id: 'c-1', title: 'Course 1', lessonsCount: 10 } },
          { courseId: 'c-2', course: { id: 'c-2', title: 'Course 2', lessonsCount: 5 } },
        ],
      } as never);

      vi.mocked(UserProgress.count)
        .mockResolvedValueOnce(10 as never)  // c-1: 10/10 = 100%
        .mockResolvedValueOnce(2 as never);  // c-2: 2/5 = 40%

      const ctx = createMockContext({
        params: { id: 'p-1' },
        state: { user: { userId: 'user-1' } },
      });

      await getPathProgress(ctx);

      const body = ctx.body as {
        success: boolean;
        data: { overallProgress: number; completedCourses: number; courses: Array<{ completed: boolean }> };
      };
      expect(body.success).toBe(true);
      expect(body.data.completedCourses).toBe(1);
      expect(body.data.overallProgress).toBe(50);
      expect(body.data.courses[0].completed).toBe(true);
      expect(body.data.courses[1].completed).toBe(false);
    });

    it('should throw 404 when path not found', async () => {
      vi.mocked(CoursePath.findByPk).mockResolvedValue(null);

      const ctx = createMockContext({
        params: { id: 'x' },
        state: { user: { userId: 'u-1' } },
      });

      await expect(getPathProgress(ctx)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ===========================================================================
  // Prerequisites
  // ===========================================================================

  describe('getPrerequisites', () => {
    it('should return prerequisite courses', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue({ id: 'c-1' } as never);
      vi.mocked(CoursePrerequisite.findAll).mockResolvedValue([
        { prerequisiteCourseId: 'c-2' },
        { prerequisiteCourseId: 'c-3' },
      ] as never);
      vi.mocked(Course.findAll).mockResolvedValue([
        { id: 'c-2', title: 'Prereq 1' },
        { id: 'c-3', title: 'Prereq 2' },
      ] as never);

      const ctx = createMockContext({ params: { id: 'c-1' } });

      await getPrerequisites(ctx);

      const body = ctx.body as { success: boolean; data: Array<{ id: string }> };
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
    });

    it('should return empty array when no prerequisites', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue({ id: 'c-1' } as never);
      vi.mocked(CoursePrerequisite.findAll).mockResolvedValue([] as never);

      const ctx = createMockContext({ params: { id: 'c-1' } });

      await getPrerequisites(ctx);

      const body = ctx.body as { success: boolean; data: unknown[] };
      expect(body.data).toEqual([]);
    });

    it('should throw 404 when course not found', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue(null);

      const ctx = createMockContext({ params: { id: 'x' } });

      await expect(getPrerequisites(ctx)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('setPrerequisites', () => {
    it('should replace prerequisites', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue({ id: UUID1 } as never);
      vi.mocked(Course.findAll).mockResolvedValue([{ id: UUID2 }, { id: UUID3 }] as never);
      vi.mocked(CoursePrerequisite.destroy).mockResolvedValue(1 as never);
      vi.mocked(CoursePrerequisite.bulkCreate).mockResolvedValue([] as never);

      const ctx = createMockContext({
        params: { id: UUID1 },
        body: { prerequisiteIds: [UUID2, UUID3] },
      });

      await setPrerequisites(ctx);

      expect(CoursePrerequisite.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { courseId: UUID1 } })
      );
      expect(CoursePrerequisite.bulkCreate).toHaveBeenCalledWith([
        { courseId: UUID1, prerequisiteCourseId: UUID2 },
        { courseId: UUID1, prerequisiteCourseId: UUID3 },
      ]);
    });

    it('should reject self-reference', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue({ id: UUID1 } as never);

      const ctx = createMockContext({
        params: { id: UUID1 },
        body: { prerequisiteIds: [UUID1] },
      });

      await expect(setPrerequisites(ctx)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should reject when prerequisite course not found', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue({ id: UUID1 } as never);
      vi.mocked(Course.findAll).mockResolvedValue([{ id: UUID2 }] as never); // Only 1 of 2 found

      const ctx = createMockContext({
        params: { id: UUID1 },
        body: { prerequisiteIds: [UUID2, UUID3] },
      });

      await expect(setPrerequisites(ctx)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should throw 404 when course not found', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue(null);

      const ctx = createMockContext({
        params: { id: UUID1 },
        body: { prerequisiteIds: [] },
      });

      await expect(setPrerequisites(ctx)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should clear all prerequisites when empty array', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue({ id: UUID1 } as never);
      vi.mocked(CoursePrerequisite.destroy).mockResolvedValue(2 as never);

      const ctx = createMockContext({
        params: { id: UUID1 },
        body: { prerequisiteIds: [] },
      });

      await setPrerequisites(ctx);

      expect(CoursePrerequisite.destroy).toHaveBeenCalled();
      expect(CoursePrerequisite.bulkCreate).not.toHaveBeenCalled();
    });
  });

  describe('checkPrerequisitesMet', () => {
    it('should return met=true when no prerequisites', async () => {
      vi.mocked(CoursePrerequisite.findAll).mockResolvedValue([] as never);

      const ctx = createMockContext({
        params: { id: 'c-1' },
        state: { user: { userId: 'u-1' } },
      });

      await checkPrerequisitesMet(ctx);

      const body = ctx.body as { success: boolean; data: { met: boolean; missing: string[] } };
      expect(body.data.met).toBe(true);
      expect(body.data.missing).toEqual([]);
    });

    it('should return met=true when all prerequisites completed', async () => {
      vi.mocked(CoursePrerequisite.findAll).mockResolvedValue([
        { prerequisiteCourseId: 'c-2' },
      ] as never);
      vi.mocked(Course.findByPk).mockResolvedValue({ id: 'c-2', lessonsCount: 5 } as never);
      vi.mocked(UserProgress.count).mockResolvedValue(5 as never);

      const ctx = createMockContext({
        params: { id: 'c-1' },
        state: { user: { userId: 'u-1' } },
      });

      await checkPrerequisitesMet(ctx);

      const body = ctx.body as { data: { met: boolean; missing: string[] } };
      expect(body.data.met).toBe(true);
      expect(body.data.missing).toEqual([]);
    });

    it('should return missing prerequisites', async () => {
      vi.mocked(CoursePrerequisite.findAll).mockResolvedValue([
        { prerequisiteCourseId: 'c-2' },
        { prerequisiteCourseId: 'c-3' },
      ] as never);
      vi.mocked(Course.findByPk)
        .mockResolvedValueOnce({ id: 'c-2', lessonsCount: 10 } as never)
        .mockResolvedValueOnce({ id: 'c-3', lessonsCount: 5 } as never);
      vi.mocked(UserProgress.count)
        .mockResolvedValueOnce(3 as never)  // c-2: 3/10, not complete
        .mockResolvedValueOnce(5 as never); // c-3: 5/5, complete

      const ctx = createMockContext({
        params: { id: 'c-1' },
        state: { user: { userId: 'u-1' } },
      });

      await checkPrerequisitesMet(ctx);

      const body = ctx.body as { data: { met: boolean; missing: string[] } };
      expect(body.data.met).toBe(false);
      expect(body.data.missing).toEqual(['c-2']);
    });
  });
});

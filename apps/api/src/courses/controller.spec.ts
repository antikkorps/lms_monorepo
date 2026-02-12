import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { UserRole, CourseStatus, LessonType } from '../database/models/enums.js';

// =============================================================================
// Module Mocks
// =============================================================================

vi.mock('../database/models/index.js', () => ({
  Course: {
    findAndCountAll: vi.fn(),
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
  },
  Chapter: {
    findAll: vi.fn(),
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
    max: vi.fn(),
    update: vi.fn(),
  },
  Lesson: {
    findAll: vi.fn(),
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
    max: vi.fn(),
    update: vi.fn(),
  },
  LessonContent: {
    findAll: vi.fn(),
    findOne: vi.fn(),
  },
  User: {},
}));

vi.mock('../database/sequelize.js', () => ({
  sequelize: {
    transaction: vi.fn((callback) => callback({})),
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../services/transcoding/index.js', () => ({
  isTranscodingAvailable: vi.fn().mockReturnValue(false),
  getTranscoding: vi.fn().mockReturnValue({
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Import after mocks
import {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  getMyCourses,
  listChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapters,
  listLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
} from './controller.js';
import { Course, Chapter, Lesson } from '../database/models/index.js';

// =============================================================================
// Test Helpers
// =============================================================================

interface MockContextOptions {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  state?: Record<string, unknown>;
  headers?: Record<string, string>;
}

function createMockContext(options: MockContextOptions = {}): Context {
  const headers = options.headers || {};
  return {
    params: options.params || {},
    query: options.query || {},
    request: {
      body: options.body || {},
    },
    state: options.state || {},
    status: 200,
    body: null,
    get: (name: string) => headers[name.toLowerCase()] || '',
  } as unknown as Context;
}

function createMockCourse(overrides: Record<string, unknown> = {}) {
  const data = {
    id: 'course-123',
    title: 'Test Course',
    slug: 'test-course',
    description: 'A test course',
    status: CourseStatus.DRAFT,
    instructorId: 'instructor-123',
    price: 0,
    duration: 0,
    chaptersCount: 0,
    lessonsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  return {
    ...data,
    update: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    increment: vi.fn().mockResolvedValue(undefined),
    decrement: vi.fn().mockResolvedValue(undefined),
    toJSON: () => data,
  };
}

function createMockChapter(overrides: Record<string, unknown> = {}) {
  const data = {
    id: 'chapter-123',
    courseId: 'course-123',
    title: 'Test Chapter',
    description: null,
    position: 0,
    lessons: [],
    ...overrides,
  };
  return {
    ...data,
    update: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    toJSON: () => data,
  };
}

function createMockLesson(overrides: Record<string, unknown> = {}) {
  const { chapter, ...restOverrides } = overrides;
  const data = {
    id: 'lesson-123',
    chapterId: 'chapter-123',
    title: 'Test Lesson',
    type: LessonType.VIDEO,
    videoUrl: null,
    videoId: null,
    duration: 0,
    position: 0,
    isFree: false,
    requiresPrevious: true,
    contents: [], // LessonContent for localization
    ...restOverrides,
  };
  return {
    ...data,
    chapter: (chapter as Record<string, unknown>) || { course: createMockCourse() },
    update: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    toJSON: () => data,
  };
}

// =============================================================================
// Test Suite
// =============================================================================

describe('Courses Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // listCourses
  // ===========================================================================

  describe('listCourses', () => {
    it('should return paginated list of published courses for public users', async () => {
      const mockCourses = [createMockCourse({ status: CourseStatus.PUBLISHED })];
      vi.mocked(Course.findAndCountAll).mockResolvedValue({
        rows: mockCourses,
        count: 1,
      } as never);

      const ctx = createMockContext({ query: { page: 1, limit: 20 } });
      await listCourses(ctx);

      expect(Course.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: CourseStatus.PUBLISHED }),
        })
      );
      expect(ctx.body).toEqual({
        data: mockCourses,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should filter by status for authenticated instructors', async () => {
      const mockCourses = [createMockCourse({ status: CourseStatus.DRAFT })];
      vi.mocked(Course.findAndCountAll).mockResolvedValue({
        rows: mockCourses,
        count: 1,
      } as never);

      const ctx = createMockContext({
        query: { page: 1, limit: 20, status: CourseStatus.DRAFT },
        state: {
          user: { userId: 'user-123', role: UserRole.INSTRUCTOR },
        },
      });
      await listCourses(ctx);

      expect(Course.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: CourseStatus.DRAFT }),
        })
      );
    });
  });

  // ===========================================================================
  // getCourse
  // ===========================================================================

  describe('getCourse', () => {
    it('should return course by ID', async () => {
      const mockCourse = createMockCourse({ status: CourseStatus.PUBLISHED });
      vi.mocked(Course.findOne).mockResolvedValue(mockCourse as never);

      const ctx = createMockContext({
        params: { id: 'course-123' },
      });
      await getCourse(ctx);

      expect(ctx.body).toEqual({
        data: expect.objectContaining({
          id: 'course-123',
          title: 'Test Course',
          locale: 'en',
        }),
      });
    });

    it('should return course by slug', async () => {
      const mockCourse = createMockCourse({ status: CourseStatus.PUBLISHED });
      vi.mocked(Course.findOne).mockResolvedValue(mockCourse as never);

      const ctx = createMockContext({
        params: { id: 'test-course' },
      });
      await getCourse(ctx);

      expect(Course.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'test-course' },
        })
      );
    });

    it('should throw 404 for non-existent course', async () => {
      vi.mocked(Course.findOne).mockResolvedValue(null as never);

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
      });

      await expect(getCourse(ctx)).rejects.toThrow('Course not found');
    });

    it('should hide unpublished courses from public users', async () => {
      const mockCourse = createMockCourse({ status: CourseStatus.DRAFT });
      vi.mocked(Course.findOne).mockResolvedValue(mockCourse as never);

      const ctx = createMockContext({
        params: { id: 'course-123' },
      });

      await expect(getCourse(ctx)).rejects.toThrow('Course not found');
    });

    it('should show unpublished courses to the instructor', async () => {
      const mockCourse = createMockCourse({
        status: CourseStatus.DRAFT,
        instructorId: 'instructor-123',
      });
      vi.mocked(Course.findOne).mockResolvedValue(mockCourse as never);

      const ctx = createMockContext({
        params: { id: 'course-123' },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });
      await getCourse(ctx);

      expect(ctx.body).toEqual({
        data: expect.objectContaining({
          id: 'course-123',
          status: CourseStatus.DRAFT,
          locale: 'en',
        }),
      });
    });
  });

  // ===========================================================================
  // createCourse
  // ===========================================================================

  describe('createCourse', () => {
    it('should create a course for authenticated instructor', async () => {
      const mockCourse = createMockCourse();
      vi.mocked(Course.findOne).mockResolvedValue(null as never);
      vi.mocked(Course.create).mockResolvedValue(mockCourse as never);

      const ctx = createMockContext({
        body: { title: 'New Course', description: 'Course description' },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });
      await createCourse(ctx);

      expect(Course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Course',
          slug: 'new-course',
          instructorId: 'instructor-123',
          status: CourseStatus.DRAFT,
        })
      );
      expect(ctx.status).toBe(201);
      expect(ctx.body).toEqual({ data: mockCourse });
    });

    it('should throw error for unauthenticated users', async () => {
      const ctx = createMockContext({
        body: { title: 'New Course' },
      });

      await expect(createCourse(ctx)).rejects.toThrow('Authentication required');
    });

    it('should throw error if slug already exists', async () => {
      vi.mocked(Course.findOne).mockResolvedValue(createMockCourse() as never);

      const ctx = createMockContext({
        body: { title: 'Existing Course' },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });

      await expect(createCourse(ctx)).rejects.toThrow('A course with this slug already exists');
    });
  });

  // ===========================================================================
  // updateCourse
  // ===========================================================================

  describe('updateCourse', () => {
    it('should update course for instructor', async () => {
      const mockCourse = createMockCourse({ instructorId: 'instructor-123' });
      vi.mocked(Course.findByPk).mockResolvedValue(mockCourse as never);

      const ctx = createMockContext({
        params: { id: 'course-123' },
        body: { title: 'Updated Title' },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });
      await updateCourse(ctx);

      expect(mockCourse.update).toHaveBeenCalledWith({ title: 'Updated Title' });
    });

    it('should throw 403 for non-owner instructor', async () => {
      const mockCourse = createMockCourse({ instructorId: 'other-instructor' });
      vi.mocked(Course.findByPk).mockResolvedValue(mockCourse as never);

      const ctx = createMockContext({
        params: { id: 'course-123' },
        body: { title: 'Updated Title' },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });

      await expect(updateCourse(ctx)).rejects.toThrow('You do not have permission to edit this course');
    });

    it('should allow tenant admin to update any course', async () => {
      const mockCourse = createMockCourse({ instructorId: 'other-instructor' });
      vi.mocked(Course.findByPk).mockResolvedValue(mockCourse as never);

      const ctx = createMockContext({
        params: { id: 'course-123' },
        body: { title: 'Updated Title' },
        state: {
          user: { userId: 'admin-123', role: UserRole.TENANT_ADMIN },
        },
      });
      await updateCourse(ctx);

      expect(mockCourse.update).toHaveBeenCalled();
    });

    it('should prevent publishing course without lessons', async () => {
      const mockCourse = createMockCourse({ lessonsCount: 0 });
      vi.mocked(Course.findByPk).mockResolvedValue(mockCourse as never);

      const ctx = createMockContext({
        params: { id: 'course-123' },
        body: { status: CourseStatus.PUBLISHED },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });

      await expect(updateCourse(ctx)).rejects.toThrow('Cannot publish a course without lessons');
    });
  });

  // ===========================================================================
  // deleteCourse
  // ===========================================================================

  describe('deleteCourse', () => {
    it('should delete course for instructor', async () => {
      const mockCourse = createMockCourse({ instructorId: 'instructor-123' });
      vi.mocked(Course.findByPk).mockResolvedValue(mockCourse as never);

      const ctx = createMockContext({
        params: { id: 'course-123' },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });
      await deleteCourse(ctx);

      expect(mockCourse.destroy).toHaveBeenCalled();
      expect(ctx.status).toBe(204);
    });
  });

  // ===========================================================================
  // publishCourse
  // ===========================================================================

  describe('publishCourse', () => {
    it('should publish course with lessons', async () => {
      const mockCourse = createMockCourse({
        instructorId: 'instructor-123',
        lessonsCount: 5,
      });
      vi.mocked(Course.findByPk).mockResolvedValue(mockCourse as never);

      const ctx = createMockContext({
        params: { id: 'course-123' },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });
      await publishCourse(ctx);

      expect(mockCourse.update).toHaveBeenCalledWith({ status: CourseStatus.PUBLISHED });
    });

    it('should prevent publishing course without lessons', async () => {
      const mockCourse = createMockCourse({
        instructorId: 'instructor-123',
        lessonsCount: 0,
      });
      vi.mocked(Course.findByPk).mockResolvedValue(mockCourse as never);

      const ctx = createMockContext({
        params: { id: 'course-123' },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });

      await expect(publishCourse(ctx)).rejects.toThrow('Cannot publish a course without lessons');
    });
  });

  // ===========================================================================
  // getMyCourses
  // ===========================================================================

  describe('getMyCourses', () => {
    it('should return instructor own courses', async () => {
      const mockCourses = [createMockCourse({ instructorId: 'instructor-123' })];
      vi.mocked(Course.findAndCountAll).mockResolvedValue({
        rows: mockCourses,
        count: 1,
      } as never);

      const ctx = createMockContext({
        query: { page: 1, limit: 20 },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });
      await getMyCourses(ctx);

      expect(Course.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ instructorId: 'instructor-123' }),
        })
      );
    });
  });

  // ===========================================================================
  // Chapter CRUD
  // ===========================================================================

  describe('listChapters', () => {
    it('should return chapters for a course', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue(createMockCourse() as never);
      const mockChapters = [createMockChapter()];
      vi.mocked(Chapter.findAll).mockResolvedValue(mockChapters as never);

      const ctx = createMockContext({
        params: { courseId: 'course-123' },
      });
      await listChapters(ctx);

      expect(ctx.body).toEqual({ data: mockChapters });
    });
  });

  describe('createChapter', () => {
    it('should create chapter for course owner', async () => {
      const mockCourse = createMockCourse({ instructorId: 'instructor-123' });
      vi.mocked(Course.findByPk).mockResolvedValue(mockCourse as never);
      vi.mocked(Chapter.max).mockResolvedValue(2 as never);
      const mockChapter = createMockChapter({ position: 3 });
      vi.mocked(Chapter.create).mockResolvedValue(mockChapter as never);

      const ctx = createMockContext({
        params: { courseId: 'course-123' },
        body: { title: 'New Chapter' },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });
      await createChapter(ctx);

      expect(Chapter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 'course-123',
          title: 'New Chapter',
          position: 3,
        })
      );
      expect(mockCourse.increment).toHaveBeenCalledWith('chaptersCount');
      expect(ctx.status).toBe(201);
    });
  });

  describe('updateChapter', () => {
    it('should update chapter for course owner', async () => {
      const mockCourse = createMockCourse({ instructorId: 'instructor-123' });
      vi.mocked(Course.findByPk).mockResolvedValue(mockCourse as never);
      const mockChapter = createMockChapter();
      vi.mocked(Chapter.findOne).mockResolvedValue(mockChapter as never);

      const ctx = createMockContext({
        params: { courseId: 'course-123', id: 'chapter-123' },
        body: { title: 'Updated Chapter' },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });
      await updateChapter(ctx);

      expect(mockChapter.update).toHaveBeenCalledWith({ title: 'Updated Chapter' });
    });
  });

  describe('deleteChapter', () => {
    it('should delete chapter and update counts', async () => {
      const mockCourse = createMockCourse({ instructorId: 'instructor-123' });
      vi.mocked(Course.findByPk).mockResolvedValue(mockCourse as never);
      const mockChapter = createMockChapter({ lessons: [{}, {}] });
      vi.mocked(Chapter.findOne).mockResolvedValue(mockChapter as never);

      const ctx = createMockContext({
        params: { courseId: 'course-123', id: 'chapter-123' },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });
      await deleteChapter(ctx);

      expect(mockChapter.destroy).toHaveBeenCalled();
      expect(mockCourse.decrement).toHaveBeenCalledWith('chaptersCount');
      expect(mockCourse.decrement).toHaveBeenCalledWith('lessonsCount', { by: 2 });
      expect(ctx.status).toBe(204);
    });
  });

  describe('reorderChapters', () => {
    it('should reorder chapters', async () => {
      const mockCourse = createMockCourse({ instructorId: 'instructor-123' });
      vi.mocked(Course.findByPk).mockResolvedValue(mockCourse as never);

      const ctx = createMockContext({
        params: { courseId: 'course-123' },
        body: { order: ['chapter-2', 'chapter-1', 'chapter-3'] },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });
      await reorderChapters(ctx);

      expect(Chapter.update).toHaveBeenCalledTimes(3);
      expect(ctx.body).toEqual({ message: 'Chapters reordered successfully' });
    });
  });

  // ===========================================================================
  // Lesson CRUD
  // ===========================================================================

  describe('listLessons', () => {
    it('should return lessons for a chapter', async () => {
      vi.mocked(Chapter.findOne).mockResolvedValue(createMockChapter() as never);
      const mockLessons = [createMockLesson()];
      vi.mocked(Lesson.findAll).mockResolvedValue(mockLessons as never);

      const ctx = createMockContext({
        params: { courseId: 'course-123', chapterId: 'chapter-123' },
      });
      await listLessons(ctx);

      expect(ctx.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'lesson-123',
            title: 'Test Lesson',
          }),
        ]),
        locale: 'en',
      });
    });
  });

  describe('createLesson', () => {
    it('should create lesson and update course counts', async () => {
      const mockCourse = createMockCourse({ instructorId: 'instructor-123' });
      vi.mocked(Course.findByPk).mockResolvedValue(mockCourse as never);
      vi.mocked(Chapter.findOne).mockResolvedValue(createMockChapter() as never);
      vi.mocked(Lesson.max).mockResolvedValue(1 as never);
      const mockLesson = createMockLesson({ position: 2, duration: 300 });
      vi.mocked(Lesson.create).mockResolvedValue(mockLesson as never);

      const ctx = createMockContext({
        params: { courseId: 'course-123', chapterId: 'chapter-123' },
        body: { title: 'New Lesson', duration: 300 },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });
      await createLesson(ctx);

      expect(Lesson.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chapterId: 'chapter-123',
          title: 'New Lesson',
          type: LessonType.VIDEO,
          position: 2,
        })
      );
      expect(mockCourse.increment).toHaveBeenCalledWith('lessonsCount');
      expect(mockCourse.increment).toHaveBeenCalledWith('duration', { by: 300 });
      expect(ctx.status).toBe(201);
    });
  });

  describe('updateLesson', () => {
    it('should update lesson and adjust course duration', async () => {
      const mockCourse = createMockCourse({ instructorId: 'instructor-123' });
      const mockLesson = createMockLesson({
        duration: 100,
        chapter: { course: mockCourse },
      });
      vi.mocked(Lesson.findByPk).mockResolvedValue(mockLesson as never);

      const ctx = createMockContext({
        params: { id: 'lesson-123' },
        body: { title: 'Updated Lesson', duration: 200 },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });
      await updateLesson(ctx);

      expect(mockLesson.update).toHaveBeenCalledWith({ title: 'Updated Lesson', duration: 200 });
      expect(mockCourse.increment).toHaveBeenCalledWith('duration', { by: 100 });
    });
  });

  describe('deleteLesson', () => {
    it('should delete lesson and update counts', async () => {
      const mockCourse = createMockCourse({ instructorId: 'instructor-123' });
      const mockLesson = createMockLesson({
        duration: 300,
        chapter: { course: mockCourse },
      });
      vi.mocked(Lesson.findByPk).mockResolvedValue(mockLesson as never);

      const ctx = createMockContext({
        params: { id: 'lesson-123' },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });
      await deleteLesson(ctx);

      expect(mockLesson.destroy).toHaveBeenCalled();
      expect(mockCourse.decrement).toHaveBeenCalledWith('lessonsCount');
      expect(mockCourse.decrement).toHaveBeenCalledWith('duration', { by: 300 });
      expect(ctx.status).toBe(204);
    });
  });

  describe('reorderLessons', () => {
    it('should reorder lessons', async () => {
      const mockCourse = createMockCourse({ instructorId: 'instructor-123' });
      vi.mocked(Course.findByPk).mockResolvedValue(mockCourse as never);
      vi.mocked(Chapter.findOne).mockResolvedValue(createMockChapter() as never);

      const ctx = createMockContext({
        params: { courseId: 'course-123', chapterId: 'chapter-123' },
        body: { order: ['lesson-2', 'lesson-1', 'lesson-3'] },
        state: {
          user: { userId: 'instructor-123', role: UserRole.INSTRUCTOR },
        },
      });
      await reorderLessons(ctx);

      expect(Lesson.update).toHaveBeenCalledTimes(3);
      expect(ctx.body).toEqual({ message: 'Lessons reordered successfully' });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { UserRole } from '../database/models/enums.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockExists = vi.fn();
const mockGetSignedUrl = vi.fn();

vi.mock('../storage/index.js', () => ({
  getStorage: vi.fn().mockReturnValue({
    exists: (...args: unknown[]) => mockExists(...args),
    getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
  }),
  validateFile: vi.fn(),
}));

vi.mock('../database/models/index.js', () => ({
  LessonContent: { findOne: vi.fn() },
  Lesson: {},
  Chapter: {},
  Course: {},
}));

vi.mock('../utils/course-access.js', () => ({
  checkCourseAccess: vi.fn(),
}));

// Import after mocks
import { getFileInfo } from './controller.js';
import { LessonContent } from '../database/models/index.js';
import { checkCourseAccess } from '../utils/course-access.js';

// =============================================================================
// Helpers
// =============================================================================

function createMockContext(options: { params?: Record<string, string>; state?: Record<string, unknown> } = {}): Context {
  return {
    params: options.params || {},
    state: options.state || {},
    status: 200,
    body: null,
  } as unknown as Context;
}

const learnerState = { user: { userId: 'learner-1', email: 'l@test.com', role: UserRole.LEARNER } };
const instructorState = { user: { userId: 'instructor-1', email: 'i@test.com', role: UserRole.INSTRUCTOR } };

function trackedContent(courseId: string) {
  return {
    id: 'content-1',
    videoSourceKey: 'videos/source.mp4',
    lesson: { chapter: { course: { id: courseId } } },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('uploads getFileInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExists.mockResolvedValue(true);
    mockGetSignedUrl.mockResolvedValue('https://signed.example.com/url');
  });

  it('requires authentication', async () => {
    const ctx = createMockContext({ params: { key: 'videos/source.mp4' } });
    await expect(getFileInfo(ctx)).rejects.toThrow('Authentication required');
  });

  it('denies a learner without access to a tracked source video (IDOR guard)', async () => {
    vi.mocked(LessonContent.findOne).mockResolvedValue(trackedContent('course-1') as never);
    vi.mocked(checkCourseAccess).mockResolvedValue({ hasAccess: false } as never);

    const ctx = createMockContext({ params: { key: 'videos/source.mp4' }, state: learnerState });
    await expect(getFileInfo(ctx)).rejects.toThrow('You do not have access to this file');
    expect(checkCourseAccess).toHaveBeenCalledWith(learnerState.user, 'course-1');
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it('signs the URL for a learner WITH course access', async () => {
    vi.mocked(LessonContent.findOne).mockResolvedValue(trackedContent('course-1') as never);
    vi.mocked(checkCourseAccess).mockResolvedValue({ hasAccess: true, accessType: 'purchase' } as never);

    const ctx = createMockContext({ params: { key: 'videos/source.mp4' }, state: learnerState });
    await getFileInfo(ctx);

    expect((ctx.body as { data: { url: string } }).data.url).toBe('https://signed.example.com/url');
  });

  it('denies a learner for an untracked key', async () => {
    vi.mocked(LessonContent.findOne).mockResolvedValue(null as never);

    const ctx = createMockContext({ params: { key: 'images/random.jpg' }, state: learnerState });
    await expect(getFileInfo(ctx)).rejects.toThrow('You do not have access to this file');
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it('allows an instructor for an untracked key', async () => {
    vi.mocked(LessonContent.findOne).mockResolvedValue(null as never);

    const ctx = createMockContext({ params: { key: 'images/random.jpg' }, state: instructorState });
    await getFileInfo(ctx);

    expect((ctx.body as { data: { url: string } }).data.url).toBe('https://signed.example.com/url');
  });
});

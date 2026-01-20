/**
 * Course Detail Composable
 * Handles fetching and managing a single course's data
 */

import type { CourseDetail, ChapterWithLessons, LessonItem } from '@shared/types';
import { ref, computed } from 'vue';
import { useApi } from './useApi';

interface EnrollmentStatus {
  isEnrolled: boolean;
  progress: number;
  completedLessons: string[];
  lastAccessedLessonId: string | null;
}

// Extended course type with enrollment info
export interface CourseWithEnrollment extends CourseDetail {
  enrollment: EnrollmentStatus | null;
}

// Mock data for development
function getMockCourse(slug: string): CourseWithEnrollment | null {
  const courses: Record<string, CourseWithEnrollment> = {
    'intro-ml': {
      id: '1',
      title: 'Introduction to Machine Learning',
      slug: 'intro-ml',
      description:
        'Learn the fundamentals of machine learning, from basic concepts to practical implementations. This comprehensive course covers supervised and unsupervised learning, neural networks, and real-world applications using Python and popular ML libraries.',
      thumbnailUrl: null,
      instructorName: 'Dr. Sarah Chen',
      price: 4900,
      duration: 480,
      chaptersCount: 4,
      lessonsCount: 16,
      chapters: [
        {
          id: 'ch1',
          title: 'Getting Started with ML',
          description: 'Introduction to machine learning concepts and setup',
          position: 1,
          lessons: [
            { id: 'l1', title: 'What is Machine Learning?', type: 'video', duration: 15, position: 1, isFree: true, isCompleted: true, isAccessible: true },
            { id: 'l2', title: 'Types of Machine Learning', type: 'video', duration: 20, position: 2, isFree: true, isCompleted: true, isAccessible: true },
            { id: 'l3', title: 'Setting Up Your Environment', type: 'video', duration: 25, position: 3, isFree: false, isCompleted: true, isAccessible: true },
            { id: 'l4', title: 'Chapter 1 Quiz', type: 'quiz', duration: 10, position: 4, isFree: false, isCompleted: false, isAccessible: true },
          ],
        },
        {
          id: 'ch2',
          title: 'Supervised Learning',
          description: 'Learn about regression and classification algorithms',
          position: 2,
          lessons: [
            { id: 'l5', title: 'Linear Regression', type: 'video', duration: 30, position: 1, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l6', title: 'Logistic Regression', type: 'video', duration: 25, position: 2, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l7', title: 'Decision Trees', type: 'video', duration: 35, position: 3, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l8', title: 'Hands-on: Classification Project', type: 'assignment', duration: 45, position: 4, isFree: false, isCompleted: false, isAccessible: true },
          ],
        },
        {
          id: 'ch3',
          title: 'Neural Networks',
          description: 'Deep dive into neural networks and deep learning',
          position: 3,
          lessons: [
            { id: 'l9', title: 'Introduction to Neural Networks', type: 'video', duration: 30, position: 1, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l10', title: 'Backpropagation Explained', type: 'video', duration: 35, position: 2, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l11', title: 'Building Your First Neural Network', type: 'video', duration: 40, position: 3, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l12', title: 'Neural Networks Quiz', type: 'quiz', duration: 15, position: 4, isFree: false, isCompleted: false, isAccessible: true },
          ],
        },
        {
          id: 'ch4',
          title: 'Real-World Applications',
          description: 'Apply ML to solve real problems',
          position: 4,
          lessons: [
            { id: 'l13', title: 'Image Classification', type: 'video', duration: 35, position: 1, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l14', title: 'Natural Language Processing', type: 'video', duration: 40, position: 2, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l15', title: 'Final Project', type: 'assignment', duration: 60, position: 3, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l16', title: 'Course Conclusion', type: 'video', duration: 10, position: 4, isFree: false, isCompleted: false, isAccessible: true },
          ],
        },
      ],
      enrollment: {
        isEnrolled: true,
        progress: 19,
        completedLessons: ['l1', 'l2', 'l3'],
        lastAccessedLessonId: 'l4',
      },
    },
    'advanced-typescript': {
      id: '2',
      title: 'Advanced TypeScript Patterns',
      slug: 'advanced-typescript',
      description:
        'Master TypeScript with advanced patterns, generics, and type manipulation techniques. Learn to write type-safe code that scales.',
      thumbnailUrl: null,
      instructorName: 'Mike Johnson',
      price: 0,
      duration: 360,
      chaptersCount: 3,
      lessonsCount: 12,
      chapters: [
        {
          id: 'ch1',
          title: 'Advanced Types',
          description: 'Deep dive into TypeScript type system',
          position: 1,
          lessons: [
            { id: 'l1', title: 'Conditional Types', type: 'video', duration: 25, position: 1, isFree: true, isCompleted: false, isAccessible: true },
            { id: 'l2', title: 'Mapped Types', type: 'video', duration: 30, position: 2, isFree: true, isCompleted: false, isAccessible: true },
            { id: 'l3', title: 'Template Literal Types', type: 'video', duration: 25, position: 3, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l4', title: 'Types Quiz', type: 'quiz', duration: 10, position: 4, isFree: false, isCompleted: false, isAccessible: true },
          ],
        },
        {
          id: 'ch2',
          title: 'Generics Mastery',
          description: 'Everything about generics',
          position: 2,
          lessons: [
            { id: 'l5', title: 'Generic Constraints', type: 'video', duration: 30, position: 1, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l6', title: 'Generic Inference', type: 'video', duration: 35, position: 2, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l7', title: 'Generic Patterns', type: 'video', duration: 30, position: 3, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l8', title: 'Generics Assignment', type: 'assignment', duration: 40, position: 4, isFree: false, isCompleted: false, isAccessible: true },
          ],
        },
        {
          id: 'ch3',
          title: 'Real-World Patterns',
          description: 'Production patterns and best practices',
          position: 3,
          lessons: [
            { id: 'l9', title: 'Builder Pattern', type: 'video', duration: 25, position: 1, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l10', title: 'Factory Pattern', type: 'video', duration: 25, position: 2, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l11', title: 'Type-Safe APIs', type: 'video', duration: 35, position: 3, isFree: false, isCompleted: false, isAccessible: true },
            { id: 'l12', title: 'Final Quiz', type: 'quiz', duration: 15, position: 4, isFree: false, isCompleted: false, isAccessible: true },
          ],
        },
      ],
      enrollment: null,
    },
  };

  return courses[slug] || null;
}

export function useCourseDetail(slug: string) {
  const api = useApi();

  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const course = ref<CourseWithEnrollment | null>(null);

  // Computed helpers
  const isEnrolled = computed(() => course.value?.enrollment?.isEnrolled ?? false);
  const progress = computed(() => course.value?.enrollment?.progress ?? 0);
  const isFree = computed(() => course.value?.price === 0);

  const totalLessons = computed(() => {
    if (!course.value) return 0;
    return course.value.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
  });

  const completedLessonsCount = computed(() => {
    return course.value?.enrollment?.completedLessons.length ?? 0;
  });

  const nextLesson = computed((): LessonItem | null => {
    if (!course.value || !course.value.enrollment) return null;
    const { completedLessons } = course.value.enrollment;

    for (const chapter of course.value.chapters) {
      for (const lesson of chapter.lessons) {
        if (!completedLessons.includes(lesson.id)) {
          return lesson;
        }
      }
    }
    return null;
  });

  const freeLessonsCount = computed(() => {
    if (!course.value) return 0;
    return course.value.chapters.reduce(
      (sum, ch) => sum + ch.lessons.filter((l) => l.isFree).length,
      0
    );
  });

  /**
   * Format duration in minutes to human readable
   */
  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  /**
   * Format price
   */
  function formatPrice(price: number): string {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(price / 100);
  }

  /**
   * Get lesson type icon name
   */
  function getLessonTypeIcon(type: LessonItem['type']): string {
    switch (type) {
      case 'video':
        return 'play-circle';
      case 'quiz':
        return 'help-circle';
      case 'document':
        return 'file-text';
      case 'assignment':
        return 'edit-3';
      default:
        return 'circle';
    }
  }

  /**
   * Check if lesson is completed
   */
  function isLessonCompleted(lessonId: string): boolean {
    return course.value?.enrollment?.completedLessons.includes(lessonId) ?? false;
  }

  /**
   * Fetch course details
   */
  async function fetchCourse(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      // TODO: Replace with real API call
      // const data = await api.get<CourseWithEnrollment>(`/courses/${slug}`);

      await new Promise((resolve) => setTimeout(resolve, 500));
      const data = getMockCourse(slug);

      if (!data) {
        error.value = 'Course not found';
        return;
      }

      course.value = data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load course';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Enroll in course
   */
  async function enroll(): Promise<boolean> {
    if (!course.value) return false;

    try {
      // TODO: Replace with real API call
      // await api.post(`/courses/${course.value.id}/enroll`);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update local state
      course.value.enrollment = {
        isEnrolled: true,
        progress: 0,
        completedLessons: [],
        lastAccessedLessonId: null,
      };

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to enroll';
      return false;
    }
  }

  return {
    // State
    isLoading,
    error,
    course,

    // Computed
    isEnrolled,
    progress,
    isFree,
    totalLessons,
    completedLessonsCount,
    nextLesson,
    freeLessonsCount,

    // Methods
    fetchCourse,
    enroll,
    formatDuration,
    formatPrice,
    getLessonTypeIcon,
    isLessonCompleted,
  };
}

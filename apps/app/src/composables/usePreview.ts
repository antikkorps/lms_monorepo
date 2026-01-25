/**
 * Preview Mode Composable
 * Manages preview state for instructor course preview functionality
 */

import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export function usePreview() {
  const route = useRoute();
  const router = useRouter();

  /**
   * Whether the current page is in preview mode
   */
  const isPreviewMode = computed(() => {
    return route.query.preview === 'true';
  });

  /**
   * Get the course slug from the current route (if available)
   */
  const previewCourseSlug = computed(() => {
    if (!isPreviewMode.value) return null;
    return route.params.slug as string | null;
  });

  /**
   * Get the lesson ID from the current route (if in lesson view)
   */
  const previewLessonId = computed(() => {
    if (!isPreviewMode.value) return null;
    return route.params.lessonId as string | null;
  });

  /**
   * Exit preview mode and return to the instructor view
   * - From course detail: go to course builder
   * - From lesson view: go to lesson editor
   */
  function exitPreview(): void {
    const courseSlug = route.params.slug as string;
    const lessonId = route.params.lessonId as string | undefined;

    if (lessonId) {
      // From lesson view, go back to lesson editor
      router.push({ name: 'instructor-lesson-edit', params: { id: lessonId } });
    } else if (courseSlug) {
      // From course detail, need to get the course ID
      // For now, just go to instructor courses list
      // In a real implementation, we'd need to fetch the course ID from the slug
      router.push({ name: 'instructor-courses' });
    } else {
      // Fallback: go to instructor dashboard
      router.push({ name: 'instructor-courses' });
    }
  }

  /**
   * Build a preview URL for a course
   */
  function buildCoursePreviewUrl(courseSlug: string): string {
    return `/courses/${courseSlug}?preview=true`;
  }

  /**
   * Build a preview URL for a lesson
   */
  function buildLessonPreviewUrl(courseSlug: string, lessonId: string): string {
    return `/courses/${courseSlug}/learn/${lessonId}?preview=true`;
  }

  /**
   * Navigate to course preview
   */
  function openCoursePreview(courseSlug: string): void {
    router.push(buildCoursePreviewUrl(courseSlug));
  }

  /**
   * Navigate to lesson preview
   */
  function openLessonPreview(courseSlug: string, lessonId: string): void {
    router.push(buildLessonPreviewUrl(courseSlug, lessonId));
  }

  return {
    // State
    isPreviewMode,
    previewCourseSlug,
    previewLessonId,

    // Methods
    exitPreview,
    buildCoursePreviewUrl,
    buildLessonPreviewUrl,
    openCoursePreview,
    openLessonPreview,
  };
}

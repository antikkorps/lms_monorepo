/**
 * Composable for managing lesson content translations
 */
import { ref, computed } from 'vue';
import { useApi } from './useApi';
import type { SupportedLocale } from '@shared/types';

export interface LessonContentItem {
  id: string;
  lessonId: string;
  lang: SupportedLocale;
  title: string | null;
  videoUrl: string | null;
  videoId: string | null;
  transcript: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertLessonContentInput {
  lang: SupportedLocale;
  title?: string | null;
  videoUrl?: string | null;
  videoId?: string | null;
  transcript?: string | null;
  description?: string | null;
}

export function useLessonContent(lessonId: string) {
  const api = useApi();
  const isLoading = ref(false);
  const isSaving = ref(false);
  const error = ref<string | null>(null);
  const contents = ref<LessonContentItem[]>([]);

  const supportedLocales: SupportedLocale[] = ['en', 'fr'];

  const hasContent = computed(() => contents.value.length > 0);

  const getContentByLocale = (locale: SupportedLocale): LessonContentItem | undefined => {
    return contents.value.find((c) => c.lang === locale);
  };

  async function fetchContents(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      // useApi already extracts .data from the response
      const response = await api.get<LessonContentItem[]>(
        `/lessons/${lessonId}/content`
      );
      contents.value = response;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load lesson content';
      contents.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function upsertContent(input: UpsertLessonContentInput): Promise<LessonContentItem | null> {
    isSaving.value = true;
    error.value = null;

    try {
      // useApi already extracts .data from the response
      const response = await api.put<LessonContentItem>(
        `/lessons/${lessonId}/content`,
        input
      );

      // Update local cache
      const index = contents.value.findIndex((c) => c.lang === input.lang);
      if (index >= 0) {
        contents.value[index] = response;
      } else {
        contents.value.push(response);
      }

      return response;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save lesson content';
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteContent(locale: SupportedLocale): Promise<boolean> {
    isSaving.value = true;
    error.value = null;

    try {
      await api.delete(`/lessons/${lessonId}/content/${locale}`);

      // Remove from local cache
      contents.value = contents.value.filter((c) => c.lang !== locale);

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete lesson content';
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  return {
    isLoading,
    isSaving,
    error,
    contents,
    supportedLocales,
    hasContent,
    getContentByLocale,
    fetchContents,
    upsertContent,
    deleteContent,
  };
}

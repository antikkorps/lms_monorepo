/**
 * Composable for managing lesson content translations
 */
import { ref, computed, onUnmounted } from 'vue';
import { useApi } from './useApi';
import type { SupportedLocale, TranscodingStatus } from '@shared/types';

export interface LessonContentItem {
  id: string;
  lessonId: string;
  lang: SupportedLocale;
  title: string | null;
  videoUrl: string | null;
  videoId: string | null;
  transcript: string | null;
  description: string | null;
  transcodingStatus: TranscodingStatus | null;
  videoSourceKey: string | null;
  videoPlaybackUrl: string | null;
  videoStreamId: string | null;
  transcodingError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TranscodingStatusResponse {
  transcodingStatus: TranscodingStatus | null;
  videoPlaybackUrl: string | null;
  videoStreamId: string | null;
  transcodingError: string | null;
  videoSourceKey: string | null;
}

export interface UpsertLessonContentInput {
  lang: SupportedLocale;
  title?: string | null;
  videoUrl?: string | null;
  videoId?: string | null;
  videoSourceKey?: string | null;
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

  let pollingTimer: ReturnType<typeof setInterval> | null = null;

  async function pollTranscodingStatus(locale: SupportedLocale): Promise<TranscodingStatusResponse | null> {
    try {
      const response = await api.get<TranscodingStatusResponse>(
        `/lessons/${lessonId}/content/${locale}/transcoding`
      );

      // Update local cache with new transcoding status
      const content = contents.value.find((c) => c.lang === locale);
      if (content && response) {
        content.transcodingStatus = response.transcodingStatus;
        content.videoPlaybackUrl = response.videoPlaybackUrl;
        content.videoStreamId = response.videoStreamId;
        content.transcodingError = response.transcodingError;
      }

      return response;
    } catch {
      return null;
    }
  }

  function startTranscodingPolling(locale: SupportedLocale, intervalMs = 5000): void {
    stopTranscodingPolling();
    pollingTimer = setInterval(async () => {
      const status = await pollTranscodingStatus(locale);
      if (status && (status.transcodingStatus === 'ready' || status.transcodingStatus === 'error' || !status.transcodingStatus)) {
        stopTranscodingPolling();
      }
    }, intervalMs);
  }

  function stopTranscodingPolling(): void {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  async function retryTranscoding(locale: SupportedLocale): Promise<boolean> {
    try {
      await api.post(`/lessons/${lessonId}/content/${locale}/transcoding/retry`, {});
      // Update local state
      const content = contents.value.find((c) => c.lang === locale);
      if (content) {
        content.transcodingStatus = 'pending';
        content.transcodingError = null;
      }
      return true;
    } catch {
      return false;
    }
  }

  onUnmounted(() => {
    stopTranscodingPolling();
  });

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
    pollTranscodingStatus,
    startTranscodingPolling,
    stopTranscodingPolling,
    retryTranscoding,
  };
}

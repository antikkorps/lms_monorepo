import type { CourseAnalyticsDetail, AnalyticsPeriod } from '@shared/types';
import { ref } from 'vue';
import { useApi } from './useApi';

export function useCourseAnalytics(courseId: string) {
  const api = useApi();

  const period = ref<AnalyticsPeriod>('30d');
  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const data = ref<CourseAnalyticsDetail | null>(null);
  const learnerPage = ref(1);

  async function fetchData(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await api.get<CourseAnalyticsDetail>(
        `/admin/analytics/courses/${courseId}`,
        { period: period.value, page: learnerPage.value },
      );
      data.value = result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load course analytics';
    } finally {
      isLoading.value = false;
    }
  }

  async function changePeriod(newPeriod: AnalyticsPeriod): Promise<void> {
    period.value = newPeriod;
    learnerPage.value = 1;
    await fetchData();
  }

  async function changeLearnerPage(page: number): Promise<void> {
    learnerPage.value = page;
    await fetchData();
  }

  return {
    period,
    isLoading,
    error,
    data,
    learnerPage,
    fetchData,
    changePeriod,
    changeLearnerPage,
  };
}

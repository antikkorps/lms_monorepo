import type {
  AdminAnalyticsSummary,
  RevenueTimePoint,
  TopCourseRevenue,
  CurrencyBreakdown,
  DailyEngagement,
  CourseCompletionRate,
  CategoryDistribution,
  UserGrowthPoint,
  LicenseAnalytics,
  AnalyticsPeriod,
} from '@shared/types';
import { ref } from 'vue';
import { useApi } from './useApi';

interface RevenueData {
  timeSeries: RevenueTimePoint[];
  topCourses: TopCourseRevenue[];
  currencyBreakdown: CurrencyBreakdown[];
}

interface EngagementData {
  dailyEngagement: DailyEngagement[];
  userGrowth: UserGrowthPoint[];
  completionRates: CourseCompletionRate[];
  categoryDistribution: CategoryDistribution[];
}

export function useAdminAnalytics() {
  const api = useApi();

  const period = ref<AnalyticsPeriod>('30d');
  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const overview = ref<AdminAnalyticsSummary | null>(null);
  const revenue = ref<RevenueData | null>(null);
  const engagement = ref<EngagementData | null>(null);
  const licenseAnalytics = ref<LicenseAnalytics | null>(null);

  async function fetchAll(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const p = { period: period.value };
      const overviewData = await api.get<AdminAnalyticsSummary>('/admin/analytics/overview', p);
      const revenueData = await api.get<RevenueData>('/admin/analytics/revenue', p);
      const engagementData = await api.get<EngagementData>('/admin/analytics/engagement', p);

      overview.value = overviewData;
      revenue.value = revenueData;
      engagement.value = engagementData;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load analytics';
    } finally {
      isLoading.value = false;
    }
  }

  async function changePeriod(newPeriod: AnalyticsPeriod): Promise<void> {
    period.value = newPeriod;
    await fetchAll();
  }

  async function fetchLicenseAnalytics(): Promise<void> {
    try {
      const data = await api.get<LicenseAnalytics>('/admin/analytics/licenses', { period: period.value });
      licenseAnalytics.value = data;
    } catch {
      // Non-critical - don't set main error
    }
  }

  async function exportPdf(type: 'overview' | 'revenue' | 'engagement'): Promise<void> {
    try {
      const response = await fetch(`/api/admin/analytics/export?period=${period.value}&type=${type}&format=pdf`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${type}-${period.value}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Export failed';
    }
  }

  async function exportCsv(type: 'overview' | 'revenue' | 'engagement'): Promise<void> {
    try {
      const response = await fetch(`/api/admin/analytics/export?period=${period.value}&type=${type}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${type}-${period.value}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Export failed';
    }
  }

  return {
    period,
    isLoading,
    error,
    overview,
    revenue,
    engagement,
    licenseAnalytics,
    fetchAll,
    fetchLicenseAnalytics,
    changePeriod,
    exportCsv,
    exportPdf,
  };
}

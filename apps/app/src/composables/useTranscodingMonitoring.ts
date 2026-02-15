/**
 * Transcoding Monitoring Composable
 * Handles admin transcoding stats, job listing, and retry
 */

import { ref } from 'vue';
import { useApi } from './useApi';

type BullMQStatus = 'active' | 'waiting' | 'delayed' | 'completed' | 'failed';

interface QueueStats {
  active: number;
  waiting: number;
  delayed: number;
  completed: number;
  failed: number;
}

interface TranscodingStats {
  queue: QueueStats;
  content: Record<string, number>;
}

interface TranscodingJob {
  id: string | undefined;
  name: string;
  data: Record<string, unknown>;
  attemptsMade: number;
  failedReason: string | null;
  processedOn: number | null;
  finishedOn: number | null;
  timestamp: number | null;
  delay: number | null;
}

interface JobsResponse {
  jobs: TranscodingJob[];
  pagination: {
    limit: number;
    offset: number;
  };
}

interface RetryResponse {
  id: string | undefined;
  message: string;
}

export function useTranscodingMonitoring() {
  const api = useApi();

  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const stats = ref<TranscodingStats | null>(null);
  const jobs = ref<TranscodingJob[]>([]);
  const statusFilter = ref<BullMQStatus>('failed');

  /**
   * Format epoch ms timestamp to locale string
   */
  function formatTimestamp(ts: number | null): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Get badge color classes for a BullMQ job status
   */
  function getStatusColor(status: BullMQStatus): string {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'delayed':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }

  /**
   * Get badge color for DB content transcoding status
   */
  function getContentStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ready':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }

  async function fetchStats(): Promise<void> {
    stats.value = await api.get<TranscodingStats>('/admin/transcoding/stats');
  }

  async function fetchJobs(
    status?: BullMQStatus,
    limit = 20,
    offset = 0
  ): Promise<void> {
    const data = await api.get<JobsResponse>('/admin/transcoding/jobs', {
      status: status || statusFilter.value,
      limit,
      offset,
    });
    jobs.value = data.jobs;
  }

  async function retryJob(jobId: string): Promise<RetryResponse> {
    return api.post<RetryResponse>(`/admin/transcoding/jobs/${jobId}/retry`);
  }

  async function refresh(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      await Promise.all([fetchStats(), fetchJobs()]);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to load transcoding data';
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // State
    isLoading,
    error,
    stats,
    jobs,
    statusFilter,

    // Methods
    fetchStats,
    fetchJobs,
    retryJob,
    refresh,

    // Helpers
    formatTimestamp,
    getStatusColor,
    getContentStatusColor,
  };
}

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranscodingMonitoring } from '@/composables/useTranscodingMonitoring';
import {
  Activity,
  AlertCircle,
  RefreshCw,
  Play,
  Clock,
  Timer,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';

const { t } = useI18n();

const {
  isLoading,
  error,
  stats,
  jobs,
  statusFilter,
  fetchJobs,
  retryJob,
  refresh,
  formatTimestamp,
  getStatusColor,
  getContentStatusColor,
} = useTranscodingMonitoring();

const retryingJobId = ref<string | null>(null);

const statusOptions = ['active', 'waiting', 'delayed', 'completed', 'failed'] as const;

const queueStatCards = [
  { key: 'active', icon: Play, colorClass: 'text-blue-500' },
  { key: 'waiting', icon: Clock, colorClass: 'text-yellow-500' },
  { key: 'delayed', icon: Timer, colorClass: 'text-orange-500' },
  { key: 'completed', icon: CheckCircle2, colorClass: 'text-green-500' },
  { key: 'failed', icon: XCircle, colorClass: 'text-red-500' },
] as const;

async function handleStatusChange(value: string) {
  statusFilter.value = value as typeof statusFilter.value;
  isLoading.value = true;
  try {
    await fetchJobs(statusFilter.value);
  } catch {
    // error handled by composable
  } finally {
    isLoading.value = false;
  }
}

async function handleRetry(jobId: string) {
  retryingJobId.value = jobId;
  try {
    await retryJob(jobId);
    toast.success(t('admin.transcoding.actions.retrySuccess'));
    await refresh();
  } catch {
    toast.error(t('admin.transcoding.actions.retryError'));
  } finally {
    retryingJobId.value = null;
  }
}

function truncateError(reason: string | null, maxLen = 80): string {
  if (!reason) return '-';
  return reason.length > maxLen ? reason.slice(0, maxLen) + '...' : reason;
}

function getJobType(job: { name: string; data: Record<string, unknown> }): string {
  return (job.data?.type as string) || job.name;
}

function getContentId(job: { data: Record<string, unknown> }): string {
  return (job.data?.lessonContentId as string) || '-';
}

onMounted(() => {
  refresh();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">{{ t('admin.transcoding.title') }}</h1>
        <p class="text-muted-foreground">{{ t('admin.transcoding.subtitle') }}</p>
      </div>
      <Button variant="outline" @click="refresh" :disabled="isLoading">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': isLoading }" />
        {{ t('admin.transcoding.refresh') }}
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !stats" class="space-y-4">
      <div class="grid gap-4 md:grid-cols-5">
        <Card v-for="i in 5" :key="i">
          <CardHeader class="pb-2">
            <div class="h-4 w-24 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div class="h-8 w-16 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent class="py-8">
          <div class="space-y-4">
            <div v-for="i in 5" :key="i" class="h-12 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">{{ t('admin.transcoding.error.loadFailed') }}</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="refresh">
          {{ t('admin.transcoding.error.retry') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Content -->
    <template v-else-if="stats">
      <!-- Queue Stats Cards -->
      <div class="grid gap-4 md:grid-cols-5">
        <Card v-for="card in queueStatCards" :key="card.key">
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              {{ t(`admin.transcoding.stats.${card.key}`) }}
            </CardTitle>
            <component :is="card.icon" class="h-4 w-4" :class="card.colorClass" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ stats.queue[card.key] ?? 0 }}
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Content Status Counts -->
      <Card v-if="Object.keys(stats.content).length > 0">
        <CardHeader>
          <CardTitle class="text-sm font-medium">
            {{ t('admin.transcoding.content.title') }}
          </CardTitle>
          <CardDescription>
            {{ t('admin.transcoding.content.description') }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex flex-wrap gap-3">
            <div
              v-for="(count, status) in stats.content"
              :key="status"
              class="flex items-center gap-2"
            >
              <Badge :class="getContentStatusColor(status as string)">
                {{ t(`admin.transcoding.content.${status}`, String(status)) }}
              </Badge>
              <span class="text-sm font-medium">{{ count }}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Filter -->
      <div class="flex items-center gap-4">
        <Select
          :model-value="statusFilter"
          class="w-[180px]"
          @update:model-value="handleStatusChange"
        >
          <option
            v-for="status in statusOptions"
            :key="status"
            :value="status"
          >
            {{ t(`admin.transcoding.filters.${status}`) }}
          </option>
        </Select>
      </div>

      <!-- Jobs Table -->
      <Card>
        <CardHeader>
          <CardTitle>{{ t('admin.transcoding.table.title') }}</CardTitle>
          <CardDescription>
            {{ t('admin.transcoding.table.description') }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <!-- Empty State -->
          <div v-if="jobs.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
            <Activity class="h-12 w-12 text-muted-foreground mb-4" />
            <h3 class="text-lg font-medium">{{ t('admin.transcoding.empty.title') }}</h3>
            <p class="text-sm text-muted-foreground max-w-sm mt-1">
              {{ t('admin.transcoding.empty.message') }}
            </p>
          </div>

          <!-- Table -->
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('admin.transcoding.table.id') }}</TableHead>
                <TableHead>{{ t('admin.transcoding.table.type') }}</TableHead>
                <TableHead>{{ t('admin.transcoding.table.contentId') }}</TableHead>
                <TableHead>{{ t('admin.transcoding.table.attempts') }}</TableHead>
                <TableHead>{{ t('admin.transcoding.table.error') }}</TableHead>
                <TableHead>{{ t('admin.transcoding.table.date') }}</TableHead>
                <TableHead class="text-right">{{ t('admin.transcoding.table.actions') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="job in jobs" :key="job.id">
                <TableCell class="font-mono text-xs">
                  {{ job.id }}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{{ getJobType(job) }}</Badge>
                </TableCell>
                <TableCell class="font-mono text-xs">
                  {{ getContentId(job) }}
                </TableCell>
                <TableCell>{{ job.attemptsMade }}</TableCell>
                <TableCell class="max-w-[200px]">
                  <span
                    v-if="job.failedReason"
                    class="text-xs text-destructive"
                    :title="job.failedReason"
                  >
                    {{ truncateError(job.failedReason) }}
                  </span>
                  <span v-else class="text-muted-foreground">-</span>
                </TableCell>
                <TableCell class="text-xs">
                  {{ formatTimestamp(job.timestamp) }}
                </TableCell>
                <TableCell class="text-right">
                  <Button
                    v-if="statusFilter === 'failed'"
                    variant="ghost"
                    size="sm"
                    :disabled="retryingJobId === job.id"
                    :title="t('admin.transcoding.actions.retry')"
                    @click="handleRetry(job.id!)"
                  >
                    <RotateCcw
                      class="h-4 w-4"
                      :class="{ 'animate-spin': retryingJobId === job.id }"
                    />
                    <span class="sr-only">{{ t('admin.transcoding.actions.retry') }}</span>
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </template>
  </div>
</template>

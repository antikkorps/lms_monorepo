<script setup lang="ts">
/**
 * AsyncLoader Component
 * Handles async data loading with loading, error, and empty states
 */
import { computed } from 'vue';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

const props = withDefaults(
  defineProps<{
    /** Loading state */
    loading?: boolean;
    /** Error message (if any) */
    error?: string | null;
    /** Data to check for empty state */
    data?: unknown;
    /** Show empty state when data is empty array/null/undefined */
    showEmpty?: boolean;
    /** Custom empty message */
    emptyMessage?: string;
    /** Number of skeleton rows to show */
    skeletonRows?: number;
    /** Skeleton variant */
    skeletonVariant?: 'card' | 'list' | 'text';
  }>(),
  {
    loading: false,
    error: null,
    showEmpty: true,
    skeletonRows: 3,
    skeletonVariant: 'card',
  }
);

const emit = defineEmits<{
  (e: 'retry'): void;
}>();

const { t } = useI18n();

const isEmpty = computed(() => {
  if (!props.showEmpty) return false;
  if (props.data === null || props.data === undefined) return true;
  if (Array.isArray(props.data) && props.data.length === 0) return true;
  return false;
});

const showContent = computed(() => {
  return !props.loading && !props.error && !isEmpty.value;
});
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="space-y-4">
    <template v-if="skeletonVariant === 'card'">
      <Card v-for="i in skeletonRows" :key="i" class="animate-pulse">
        <CardContent class="p-4 space-y-3">
          <Skeleton class="h-4 w-3/4" />
          <Skeleton class="h-4 w-1/2" />
        </CardContent>
      </Card>
    </template>

    <template v-else-if="skeletonVariant === 'list'">
      <div v-for="i in skeletonRows" :key="i" class="flex items-center gap-4 p-4">
        <Skeleton class="h-10 w-10 rounded-full" />
        <div class="flex-1 space-y-2">
          <Skeleton class="h-4 w-1/2" />
          <Skeleton class="h-3 w-1/3" />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="space-y-2">
        <Skeleton v-for="i in skeletonRows" :key="i" class="h-4" :class="i % 2 === 0 ? 'w-full' : 'w-3/4'" />
      </div>
    </template>
  </div>

  <!-- Error State -->
  <Card v-else-if="error" class="border-destructive/50">
    <CardContent class="flex items-center gap-4 py-6">
      <AlertCircle class="h-8 w-8 text-destructive shrink-0" />
      <div class="flex-1">
        <p class="font-medium text-destructive">
          {{ t('errors.generic.message', 'Failed to load data') }}
        </p>
        <p class="text-sm text-muted-foreground">{{ error }}</p>
      </div>
      <Button variant="outline" size="sm" @click="emit('retry')">
        <RefreshCw class="mr-2 h-4 w-4" />
        {{ t('errors.retry', 'Retry') }}
      </Button>
    </CardContent>
  </Card>

  <!-- Empty State -->
  <Card v-else-if="isEmpty" class="border-dashed">
    <CardContent class="flex flex-col items-center justify-center py-12 text-center">
      <Inbox class="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p class="text-muted-foreground">
        {{ emptyMessage || t('common.noData', 'No data available') }}
      </p>
      <slot name="empty-action" />
    </CardContent>
  </Card>

  <!-- Content -->
  <slot v-else-if="showContent" />
</template>

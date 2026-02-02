<script setup lang="ts">
/**
 * ErrorBoundary Component
 * Catches errors from child components and displays a fallback UI
 */
import { ref, onErrorCaptured } from 'vue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { errorService } from '@/services/error.service';

const props = withDefaults(
  defineProps<{
    /** Custom fallback message */
    fallbackMessage?: string;
    /** Show retry button */
    showRetry?: boolean;
    /** Report errors to error service */
    reportErrors?: boolean;
    /** Component name for error context */
    name?: string;
  }>(),
  {
    showRetry: true,
    reportErrors: true,
  }
);

const emit = defineEmits<{
  (e: 'error', error: Error, info: string): void;
  (e: 'retry'): void;
}>();

const { t } = useI18n();
const hasError = ref(false);
const errorMessage = ref('');
const errorDetails = ref<string | null>(null);

onErrorCaptured((error: Error, instance, info) => {
  hasError.value = true;
  errorMessage.value = errorService.getUserMessage(error);
  errorDetails.value = import.meta.env.DEV ? info : null;

  if (props.reportErrors) {
    errorService.captureError(error, {
      type: 'vue',
      componentName: props.name || instance?.$options?.name || 'ErrorBoundary',
      info,
    });
  }

  emit('error', error, info);

  // Prevent error from propagating
  return false;
});

function handleRetry() {
  hasError.value = false;
  errorMessage.value = '';
  errorDetails.value = null;
  emit('retry');
}
</script>

<template>
  <template v-if="hasError">
    <Card class="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-destructive">
          <AlertTriangle class="h-5 w-5" />
          {{ t('errors.boundary.title') }}
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <p class="text-sm text-muted-foreground">
          {{ fallbackMessage || errorMessage || t('errors.boundary.description') }}
        </p>

        <div v-if="errorDetails" class="text-xs text-muted-foreground bg-muted p-2 rounded font-mono overflow-auto max-h-32">
          {{ errorDetails }}
        </div>

        <Button v-if="showRetry" variant="outline" size="sm" @click="handleRetry">
          <RefreshCw class="mr-2 h-4 w-4" />
          {{ t('errors.boundary.retry') }}
        </Button>
      </CardContent>
    </Card>
  </template>

  <slot v-else />
</template>

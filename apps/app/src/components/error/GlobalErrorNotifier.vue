<script setup lang="ts">
/**
 * GlobalErrorNotifier
 * Watches for global errors and displays toast notifications
 */
import { watch } from 'vue';
import { toast } from 'vue-sonner';
import { errorService } from '@/services/error.service';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Watch for new errors
watch(
  () => errorService.lastError.value,
  (newError) => {
    if (!newError) return;

    // Don't show toast for API errors (handled by composables)
    if (newError.context.type === 'api') return;

    const message = errorService.getUserMessage(newError);

    toast.error(t('errors.globalTitle', 'An error occurred'), {
      description: message,
      duration: 6000,
      action: {
        label: t('errors.dismiss', 'Dismiss'),
        onClick: () => errorService.dismissError(newError.id),
      },
    });
  }
);
</script>

<template>
  <!-- This component has no visible output, it just watches for errors -->
</template>

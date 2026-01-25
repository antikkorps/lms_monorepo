<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

interface Props {
  courseTitle?: string;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'exit'): void;
}>();

const { t } = useI18n();

function handleExit() {
  emit('exit');
}
</script>

<template>
  <div class="sticky top-0 z-50 w-full border-b border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50">
    <div class="container mx-auto flex items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 rounded-full bg-amber-200 px-3 py-1 dark:bg-amber-800">
          <Eye class="h-4 w-4 text-amber-700 dark:text-amber-300" />
          <span class="text-sm font-medium text-amber-700 dark:text-amber-300">
            {{ t('common.preview.mode', 'Preview Mode') }}
          </span>
        </div>
        <span v-if="courseTitle" class="hidden text-sm text-amber-700 dark:text-amber-300 sm:inline">
          {{ courseTitle }}
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        class="border-amber-400 bg-transparent text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900"
        @click="handleExit"
      >
        <X class="mr-2 h-4 w-4" />
        {{ t('common.preview.exit', 'Exit Preview') }}
      </Button>
    </div>
  </div>
</template>

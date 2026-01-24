<script setup lang="ts">
import type { CourseStatus } from '@shared/types';
import { Badge } from '@/components/ui/badge';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface Props {
  status: CourseStatus;
}

const props = defineProps<Props>();
const { t } = useI18n();

const variant = computed(() => {
  switch (props.status) {
    case 'published':
      return 'success';
    case 'draft':
      return 'warning';
    case 'archived':
      return 'secondary';
    default:
      return 'outline';
  }
});

const label = computed(() => {
  switch (props.status) {
    case 'published':
      return t('instructor.courseStatus.published', 'Published');
    case 'draft':
      return t('instructor.courseStatus.draft', 'Draft');
    case 'archived':
      return t('instructor.courseStatus.archived', 'Archived');
    default:
      return props.status;
  }
});
</script>

<template>
  <Badge :variant="variant">
    {{ label }}
  </Badge>
</template>

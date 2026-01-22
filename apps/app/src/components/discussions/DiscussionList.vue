<script setup lang="ts">
import type { Discussion, ReportInput } from '@shared/types';
import { ref } from 'vue';
import { Loader2, MessageSquare } from 'lucide-vue-next';
import DiscussionItem from './DiscussionItem.vue';
import ReportModal from './ReportModal.vue';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Props {
  discussions: Discussion[];
  isLoading?: boolean;
  pagination?: Pagination;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<{
  (e: 'reply', discussionId: string): void;
  (e: 'delete', discussionId: string): void;
  (e: 'report', discussionId: string, input: ReportInput): void;
  (e: 'load-more'): void;
}>();

const reportingDiscussionId = ref<string | null>(null);
const showReportModal = ref(false);

function handleReport(discussionId: string) {
  reportingDiscussionId.value = discussionId;
  showReportModal.value = true;
}

function handleReportSubmit(input: ReportInput) {
  if (reportingDiscussionId.value) {
    emit('report', reportingDiscussionId.value, input);
    showReportModal.value = false;
    reportingDiscussionId.value = null;
  }
}

function confirmDelete(discussionId: string) {
  if (confirm('Are you sure you want to delete this discussion?')) {
    emit('delete', discussionId);
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Loading state -->
    <div v-if="isLoading && discussions.length === 0" class="flex items-center justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="discussions.length === 0"
      class="flex flex-col items-center justify-center py-12 text-center"
    >
      <MessageSquare class="h-12 w-12 text-muted-foreground/50" />
      <h3 class="mt-4 font-medium">No discussions yet</h3>
      <p class="mt-1 text-sm text-muted-foreground">
        Be the first to start a discussion!
      </p>
    </div>

    <!-- Discussions list -->
    <template v-else>
      <DiscussionItem
        v-for="discussion in discussions"
        :key="discussion.id"
        :discussion="discussion"
        @reply="emit('reply', discussion.id)"
        @delete="confirmDelete(discussion.id)"
        @report="handleReport(discussion.id)"
      />

      <!-- Load more button -->
      <div
        v-if="pagination && pagination.page < pagination.totalPages"
        class="flex justify-center pt-4"
      >
        <button
          class="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          :disabled="isLoading"
          @click="emit('load-more')"
        >
          <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin" />
          <span>Load more discussions</span>
        </button>
      </div>
    </template>

    <!-- Report modal -->
    <ReportModal
      :open="showReportModal"
      @close="showReportModal = false"
      @submit="handleReportSubmit"
    />
  </div>
</template>

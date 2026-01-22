<script setup lang="ts">
import type { Discussion, DiscussionReply, ReportInput } from '@shared/types';
import { ref } from 'vue';
import { ArrowLeft, Loader2 } from 'lucide-vue-next';
import ReplyItem from './ReplyItem.vue';
import ReplyForm from './ReplyForm.vue';
import ReportModal from './ReportModal.vue';

interface Props {
  discussion: Discussion;
  replies: DiscussionReply[];
  isLoading?: boolean;
  isSubmitting?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  isSubmitting: false,
});

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'create-reply', content: string): void;
  (e: 'delete-reply', replyId: string): void;
  (e: 'report-reply', replyId: string, input: ReportInput): void;
}>();

const reportingReplyId = ref<string | null>(null);
const showReportModal = ref(false);

function handleReport(replyId: string) {
  reportingReplyId.value = replyId;
  showReportModal.value = true;
}

function handleReportSubmit(input: ReportInput) {
  if (reportingReplyId.value) {
    emit('report-reply', reportingReplyId.value, input);
    showReportModal.value = false;
    reportingReplyId.value = null;
  }
}

function confirmDelete(replyId: string) {
  if (confirm('Are you sure you want to delete this reply?')) {
    emit('delete-reply', replyId);
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center gap-3 border-b pb-3">
      <button
        class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        @click="emit('back')"
      >
        <ArrowLeft class="h-5 w-5" />
      </button>
      <div>
        <h3 class="font-medium">Replies</h3>
        <p class="text-sm text-muted-foreground">
          {{ replies.length }} {{ replies.length === 1 ? 'reply' : 'replies' }}
        </p>
      </div>
    </div>

    <!-- Original discussion -->
    <div class="rounded-lg bg-muted/50 p-4">
      <div class="flex items-center gap-2 text-sm">
        <span class="font-medium">
          {{ discussion.user?.firstName }} {{ discussion.user?.lastName }}
        </span>
        <span class="text-muted-foreground">asked</span>
      </div>
      <p class="mt-2 whitespace-pre-wrap text-sm">{{ discussion.content }}</p>
    </div>

    <!-- Replies list -->
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
    </div>

    <div v-else-if="replies.length > 0" class="divide-y">
      <ReplyItem
        v-for="reply in replies"
        :key="reply.id"
        :reply="reply"
        @delete="confirmDelete(reply.id)"
        @report="handleReport(reply.id)"
      />
    </div>

    <div v-else class="py-8 text-center text-sm text-muted-foreground">
      No replies yet. Be the first to respond!
    </div>

    <!-- Reply form -->
    <div class="border-t pt-4">
      <ReplyForm
        :is-loading="isSubmitting"
        @submit="emit('create-reply', $event)"
        @cancel="emit('back')"
      />
    </div>

    <!-- Report modal -->
    <ReportModal
      :open="showReportModal"
      @close="showReportModal = false"
      @submit="handleReportSubmit"
    />
  </div>
</template>

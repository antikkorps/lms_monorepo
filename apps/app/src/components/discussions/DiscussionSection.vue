<script setup lang="ts">
import type { CreateDiscussionInput, ReportInput } from '@shared/types';
import { ref, onMounted, watch } from 'vue';
import { useDiscussions } from '@/composables/useDiscussions';
import { useToast } from '@/composables/useToast';
import DiscussionList from './DiscussionList.vue';
import DiscussionForm from './DiscussionForm.vue';
import ReplyList from './ReplyList.vue';

interface Props {
  lessonId: string;
}

const props = defineProps<Props>();

const {
  discussions,
  isLoading,
  pagination,
  isSubmitting,
  currentDiscussion,
  replies,
  repliesLoading,
  fetchDiscussions,
  createDiscussion,
  deleteDiscussion,
  reportDiscussion,
  fetchReplies,
  createReply,
  deleteReply,
  reportReply,
  clearReplies,
} = useDiscussions(props.lessonId);

const toast = useToast();

// View state: 'list' or 'replies'
const view = ref<'list' | 'replies'>('list');
const selectedDiscussionId = ref<string | null>(null);

// Load discussions on mount
onMounted(() => {
  fetchDiscussions();
});

// Watch for lessonId changes
watch(
  () => props.lessonId,
  (newId) => {
    if (newId) {
      view.value = 'list';
      selectedDiscussionId.value = null;
      clearReplies();
      fetchDiscussions();
    }
  }
);

// Discussion actions
async function handleCreateDiscussion(content: string) {
  const input: CreateDiscussionInput = {
    lessonId: props.lessonId,
    content,
  };

  const result = await createDiscussion(input);
  if (result) {
    toast.success('Discussion posted successfully');
  }
}

async function handleDeleteDiscussion(discussionId: string) {
  const success = await deleteDiscussion(discussionId);
  if (success) {
    toast.success('Discussion deleted');
    if (view.value === 'replies' && selectedDiscussionId.value === discussionId) {
      view.value = 'list';
      selectedDiscussionId.value = null;
      clearReplies();
    }
  }
}

async function handleReportDiscussion(discussionId: string, input: ReportInput) {
  const success = await reportDiscussion(discussionId, input);
  if (success) {
    toast.success('Thank you for your report');
  }
}

// Reply actions
function handleViewReplies(discussionId: string) {
  selectedDiscussionId.value = discussionId;
  view.value = 'replies';
  fetchReplies(discussionId);
}

function handleBackToList() {
  view.value = 'list';
  selectedDiscussionId.value = null;
  clearReplies();
}

async function handleCreateReply(content: string) {
  if (!selectedDiscussionId.value) return;

  const result = await createReply(selectedDiscussionId.value, { content });
  if (result) {
    toast.success('Reply posted');
  }
}

async function handleDeleteReply(replyId: string) {
  if (!selectedDiscussionId.value) return;

  const success = await deleteReply(selectedDiscussionId.value, replyId);
  if (success) {
    toast.success('Reply deleted');
  }
}

async function handleReportReply(replyId: string, input: ReportInput) {
  if (!selectedDiscussionId.value) return;

  const success = await reportReply(selectedDiscussionId.value, replyId, input);
  if (success) {
    toast.success('Thank you for your report');
  }
}

function handleLoadMore() {
  const currentPage = pagination.value?.page || 1;
  fetchDiscussions(props.lessonId, currentPage + 1);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Discussion form (only in list view) -->
    <template v-if="view === 'list'">
      <DiscussionForm
        :is-loading="isSubmitting"
        @submit="handleCreateDiscussion"
      />

      <DiscussionList
        :discussions="discussions"
        :is-loading="isLoading"
        :pagination="pagination"
        @reply="handleViewReplies"
        @delete="handleDeleteDiscussion"
        @report="handleReportDiscussion"
        @load-more="handleLoadMore"
      />
    </template>

    <!-- Reply view -->
    <template v-else-if="view === 'replies' && currentDiscussion">
      <ReplyList
        :discussion="currentDiscussion"
        :replies="replies"
        :is-loading="repliesLoading"
        :is-submitting="isSubmitting"
        @back="handleBackToList"
        @create-reply="handleCreateReply"
        @delete-reply="handleDeleteReply"
        @report-reply="handleReportReply"
      />
    </template>
  </div>
</template>

/**
 * Discussions Composable
 * Handles discussions and replies for lessons
 */

import type {
  Discussion,
  DiscussionReply,
  CreateDiscussionInput,
  CreateReplyInput,
  ReportInput,
} from '@shared/types';
import { ref, computed } from 'vue';
import { useApi, ApiRequestError } from './useApi';
import { useToast } from './useToast';
import { useAuthStore } from '@/stores/auth';

let tempIdCounter = 0;
function generateTempId(): string {
  return `temp-${Date.now()}-${++tempIdCounter}`;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DiscussionsState {
  discussions: Discussion[];
  isLoading: boolean;
  error: string | null;
  pagination: Pagination;
  currentDiscussion: Discussion | null;
  replies: DiscussionReply[];
  repliesLoading: boolean;
  repliesPagination: Pagination;
}

export function useDiscussions(lessonId?: string) {
  const api = useApi();
  const toast = useToast();
  const authStore = useAuthStore();

  const state = ref<DiscussionsState>({
    discussions: [],
    isLoading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
    currentDiscussion: null,
    replies: [],
    repliesLoading: false,
    repliesPagination: {
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
    },
  });

  const isSubmitting = ref(false);

  /**
   * Fetch discussions for a lesson
   */
  async function fetchDiscussions(
    targetLessonId?: string,
    page = 1,
    limit = 20
  ): Promise<void> {
    const lid = targetLessonId || lessonId;
    if (!lid) {
      state.value.error = 'Lesson ID is required';
      return;
    }

    state.value.isLoading = true;
    state.value.error = null;

    try {
      const response = await api.get<{
        data: Discussion[];
        pagination: Pagination;
      }>('/discussions', {
        lessonId: lid,
        page,
        limit,
      });

      // Handle the nested response structure
      const data = (response as unknown as { data: Discussion[]; pagination: Pagination });
      state.value.discussions = data.data || response as unknown as Discussion[];
      if (data.pagination) {
        state.value.pagination = data.pagination;
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        state.value.error = err.message;
      } else {
        state.value.error = 'Failed to load discussions';
      }
    } finally {
      state.value.isLoading = false;
    }
  }

  /**
   * Create a new discussion (optimistic)
   */
  async function createDiscussion(
    input: CreateDiscussionInput
  ): Promise<Discussion | null> {
    isSubmitting.value = true;
    state.value.error = null;

    const tempId = generateTempId();
    const now = new Date();
    const user = authStore.user;

    // Create optimistic temp discussion
    const tempDiscussion: Discussion & { isPending: boolean } = {
      id: tempId,
      lessonId: input.lessonId,
      content: input.content,
      replyCount: 0,
      createdAt: now,
      updatedAt: now,
      user: user
        ? { id: user.id, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl ?? null }
        : null,
      isOwner: true,
      isPending: true,
    };

    // Add optimistically
    state.value.discussions = [tempDiscussion as Discussion, ...state.value.discussions];
    state.value.pagination.total += 1;

    try {
      const response = await api.post<{ data: Discussion }>('/discussions', input);
      const discussion = (response as unknown as { data: Discussion }).data || response as unknown as Discussion;

      // Replace temp with real
      state.value.discussions = state.value.discussions.map((d) =>
        d.id === tempId ? discussion : d
      );

      return discussion;
    } catch (err) {
      // Rollback
      state.value.discussions = state.value.discussions.filter((d) => d.id !== tempId);
      state.value.pagination.total -= 1;

      const message = err instanceof ApiRequestError ? err.message : 'Failed to create discussion';
      state.value.error = message;
      toast.error(message);
      return null;
    } finally {
      isSubmitting.value = false;
    }
  }

  /**
   * Delete a discussion
   */
  async function deleteDiscussion(
    discussionId: string,
    _reason?: string
  ): Promise<boolean> {
    try {
      await api.delete(`/discussions/${discussionId}`);

      // Remove from list
      state.value.discussions = state.value.discussions.filter(
        (d) => d.id !== discussionId
      );
      state.value.pagination.total -= 1;

      return true;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        state.value.error = err.message;
      } else {
        state.value.error = 'Failed to delete discussion';
      }
      return false;
    }
  }

  /**
   * Report a discussion
   */
  async function reportDiscussion(
    discussionId: string,
    input: ReportInput
  ): Promise<boolean> {
    try {
      await api.post(`/discussions/${discussionId}/report`, input);
      return true;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        state.value.error = err.message;
      } else {
        state.value.error = 'Failed to report discussion';
      }
      return false;
    }
  }

  // =============================================================================
  // Replies
  // =============================================================================

  /**
   * Fetch replies for a discussion
   */
  async function fetchReplies(
    discussionId: string,
    page = 1,
    limit = 50
  ): Promise<void> {
    state.value.repliesLoading = true;
    state.value.currentDiscussion =
      state.value.discussions.find((d) => d.id === discussionId) || null;

    try {
      const response = await api.get<{
        data: DiscussionReply[];
        pagination: Pagination;
      }>(`/discussions/${discussionId}/replies`, { page, limit });

      const data = (response as unknown as { data: DiscussionReply[]; pagination: Pagination });
      state.value.replies = data.data || response as unknown as DiscussionReply[];
      if (data.pagination) {
        state.value.repliesPagination = data.pagination;
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        state.value.error = err.message;
      } else {
        state.value.error = 'Failed to load replies';
      }
    } finally {
      state.value.repliesLoading = false;
    }
  }

  /**
   * Create a reply (optimistic)
   */
  async function createReply(
    discussionId: string,
    input: CreateReplyInput
  ): Promise<DiscussionReply | null> {
    isSubmitting.value = true;
    state.value.error = null;

    const tempId = generateTempId();
    const now = new Date();
    const user = authStore.user;

    // Create optimistic temp reply
    const tempReply: DiscussionReply & { isPending: boolean } = {
      id: tempId,
      discussionId,
      content: input.content,
      createdAt: now,
      updatedAt: now,
      user: user
        ? { id: user.id, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl ?? null }
        : null,
      isOwner: true,
      isPending: true,
    };

    // Add optimistically
    state.value.replies = [...state.value.replies, tempReply as DiscussionReply];
    state.value.repliesPagination.total += 1;

    const discussion = state.value.discussions.find((d) => d.id === discussionId);
    if (discussion) {
      discussion.replyCount += 1;
    }

    try {
      const response = await api.post<{ data: DiscussionReply }>(
        `/discussions/${discussionId}/replies`,
        input
      );
      const reply = (response as unknown as { data: DiscussionReply }).data || response as unknown as DiscussionReply;

      // Replace temp with real
      state.value.replies = state.value.replies.map((r) =>
        r.id === tempId ? reply : r
      );

      return reply;
    } catch (err) {
      // Rollback reply
      state.value.replies = state.value.replies.filter((r) => r.id !== tempId);
      state.value.repliesPagination.total -= 1;

      // Rollback discussion reply count
      if (discussion) {
        discussion.replyCount -= 1;
      }

      const message = err instanceof ApiRequestError ? err.message : 'Failed to create reply';
      state.value.error = message;
      toast.error(message);
      return null;
    } finally {
      isSubmitting.value = false;
    }
  }

  /**
   * Delete a reply
   */
  async function deleteReply(
    discussionId: string,
    replyId: string
  ): Promise<boolean> {
    try {
      await api.delete(`/discussions/${discussionId}/replies/${replyId}`);

      // Remove from list
      state.value.replies = state.value.replies.filter((r) => r.id !== replyId);
      state.value.repliesPagination.total -= 1;

      // Update reply count in discussion list
      const discussion = state.value.discussions.find(
        (d) => d.id === discussionId
      );
      if (discussion) {
        discussion.replyCount -= 1;
      }

      return true;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        state.value.error = err.message;
      } else {
        state.value.error = 'Failed to delete reply';
      }
      return false;
    }
  }

  /**
   * Report a reply
   */
  async function reportReply(
    discussionId: string,
    replyId: string,
    input: ReportInput
  ): Promise<boolean> {
    try {
      await api.post(
        `/discussions/${discussionId}/replies/${replyId}/report`,
        input
      );
      return true;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        state.value.error = err.message;
      } else {
        state.value.error = 'Failed to report reply';
      }
      return false;
    }
  }

  /**
   * Clear current discussion and replies
   */
  function clearReplies(): void {
    state.value.currentDiscussion = null;
    state.value.replies = [];
    state.value.repliesPagination = {
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
    };
  }

  /**
   * Clear error
   */
  function clearError(): void {
    state.value.error = null;
  }

  return {
    // State
    discussions: computed(() => state.value.discussions),
    isLoading: computed(() => state.value.isLoading),
    error: computed(() => state.value.error),
    pagination: computed(() => state.value.pagination),
    isSubmitting: computed(() => isSubmitting.value),

    // Replies state
    currentDiscussion: computed(() => state.value.currentDiscussion),
    replies: computed(() => state.value.replies),
    repliesLoading: computed(() => state.value.repliesLoading),
    repliesPagination: computed(() => state.value.repliesPagination),

    // Discussion methods
    fetchDiscussions,
    createDiscussion,
    deleteDiscussion,
    reportDiscussion,

    // Reply methods
    fetchReplies,
    createReply,
    deleteReply,
    reportReply,
    clearReplies,

    // Utilities
    clearError,
  };
}

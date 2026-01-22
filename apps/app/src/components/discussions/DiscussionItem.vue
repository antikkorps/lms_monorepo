<script setup lang="ts">
import type { Discussion } from '@shared/types';
import { computed } from 'vue';
import { MessageCircle, Trash2, Flag, MoreVertical } from 'lucide-vue-next';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  discussion: Discussion;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'reply'): void;
  (e: 'delete'): void;
  (e: 'report'): void;
}>();

const authorName = computed(() => {
  if (!props.discussion.user) return 'Unknown User';
  return `${props.discussion.user.firstName} ${props.discussion.user.lastName}`;
});

const authorInitials = computed(() => {
  if (!props.discussion.user) return '?';
  return `${props.discussion.user.firstName[0]}${props.discussion.user.lastName[0]}`.toUpperCase();
});

const timeAgo = computed(() => {
  return formatDistanceToNow(new Date(props.discussion.createdAt), {
    addSuffix: true,
  });
});
</script>

<template>
  <div class="rounded-lg border bg-card p-4">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <!-- Avatar -->
        <div
          v-if="discussion.user?.avatarUrl"
          class="h-10 w-10 shrink-0 overflow-hidden rounded-full"
        >
          <img
            :src="discussion.user.avatarUrl"
            :alt="authorName"
            class="h-full w-full object-cover"
          />
        </div>
        <div
          v-else
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary"
        >
          {{ authorInitials }}
        </div>

        <!-- Author info -->
        <div>
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ authorName }}</span>
            <span
              v-if="discussion.isOwner"
              class="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
            >
              You
            </span>
          </div>
          <span class="text-xs text-muted-foreground">{{ timeAgo }}</span>
        </div>
      </div>

      <!-- Actions menu -->
      <div class="relative">
        <div class="flex items-center gap-1">
          <button
            v-if="discussion.isOwner"
            class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Delete"
            @click="emit('delete')"
          >
            <Trash2 class="h-4 w-4" />
          </button>
          <button
            v-if="!discussion.isOwner"
            class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Report"
            @click="emit('report')"
          >
            <Flag class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="mt-3 whitespace-pre-wrap text-sm">{{ discussion.content }}</div>

    <!-- Footer -->
    <div class="mt-4 flex items-center gap-4">
      <button
        class="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        @click="emit('reply')"
      >
        <MessageCircle class="h-4 w-4" />
        <span>{{ discussion.replyCount }} {{ discussion.replyCount === 1 ? 'reply' : 'replies' }}</span>
      </button>
    </div>
  </div>
</template>

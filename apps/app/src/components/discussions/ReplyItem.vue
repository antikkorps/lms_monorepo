<script setup lang="ts">
import type { DiscussionReply } from '@shared/types';
import { computed } from 'vue';
import { Trash2, Flag } from 'lucide-vue-next';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  reply: DiscussionReply;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'delete'): void;
  (e: 'report'): void;
}>();

const authorName = computed(() => {
  if (!props.reply.user) return 'Unknown User';
  return `${props.reply.user.firstName} ${props.reply.user.lastName}`;
});

const authorInitials = computed(() => {
  if (!props.reply.user) return '?';
  return `${props.reply.user.firstName[0]}${props.reply.user.lastName[0]}`.toUpperCase();
});

const timeAgo = computed(() => {
  return formatDistanceToNow(new Date(props.reply.createdAt), {
    addSuffix: true,
  });
});
</script>

<template>
  <div class="flex gap-3 py-3">
    <!-- Avatar -->
    <div
      v-if="reply.user?.avatarUrl"
      class="h-8 w-8 shrink-0 overflow-hidden rounded-full"
    >
      <img
        :src="reply.user.avatarUrl"
        :alt="authorName"
        class="h-full w-full object-cover"
      />
    </div>
    <div
      v-else
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
    >
      {{ authorInitials }}
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">{{ authorName }}</span>
        <span
          v-if="reply.isOwner"
          class="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
        >
          You
        </span>
        <span class="text-xs text-muted-foreground">{{ timeAgo }}</span>
      </div>
      <p class="mt-1 whitespace-pre-wrap text-sm">{{ reply.content }}</p>
    </div>

    <!-- Actions -->
    <div class="flex shrink-0 items-start gap-1">
      <button
        v-if="reply.isOwner"
        class="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Delete"
        @click="emit('delete')"
      >
        <Trash2 class="h-3.5 w-3.5" />
      </button>
      <button
        v-if="!reply.isOwner"
        class="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Report"
        @click="emit('report')"
      >
        <Flag class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>

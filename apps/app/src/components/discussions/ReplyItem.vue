<script setup lang="ts">
import type { DiscussionReply } from '@shared/types';
import { computed } from 'vue';
import { Trash2, Flag } from 'lucide-vue-next';
import { UserAvatar } from '@/components/user';
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

const isPending = computed(() => (props.reply as DiscussionReply & { isPending?: boolean }).isPending === true);

const timeAgo = computed(() => {
  return formatDistanceToNow(new Date(props.reply.createdAt), {
    addSuffix: true,
  });
});
</script>

<template>
  <div class="flex gap-3 py-3" :class="{ 'opacity-60': isPending }">
    <!-- Avatar -->
    <UserAvatar
      :user-id="reply.user?.id || ''"
      :first-name="reply.user?.firstName"
      :last-name="reply.user?.lastName"
      :avatar-url="reply.user?.avatarUrl"
      :style="(reply.user?.avatarStyle as any) || 'initials'"
      :variation="reply.user?.avatarVariation ?? 0"
      size="sm"
    />

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
        class="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        title="Delete"
        :disabled="isPending"
        @click="emit('delete')"
      >
        <Trash2 class="h-3.5 w-3.5" />
      </button>
      <button
        v-if="!reply.isOwner"
        class="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        title="Report"
        :disabled="isPending"
        @click="emit('report')"
      >
        <Flag class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>

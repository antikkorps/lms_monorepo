<script setup lang="ts">
import type { Discussion } from '@shared/types';
import { computed } from 'vue';
import { MessageCircle, Trash2, Flag, MoreVertical } from 'lucide-vue-next';
import { UserAvatar } from '@/components/user';
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

const isPending = computed(() => (props.discussion as Discussion & { isPending?: boolean }).isPending === true);

const timeAgo = computed(() => {
  return formatDistanceToNow(new Date(props.discussion.createdAt), {
    addSuffix: true,
  });
});
</script>

<template>
  <div class="rounded-lg border bg-card p-4" :class="{ 'opacity-60': isPending }">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <!-- Avatar -->
        <UserAvatar
          :user-id="discussion.user?.id || ''"
          :first-name="discussion.user?.firstName"
          :last-name="discussion.user?.lastName"
          :avatar-url="discussion.user?.avatarUrl"
          :style="(discussion.user?.avatarStyle as any) || 'initials'"
          :variation="discussion.user?.avatarVariation ?? 0"
          size="md"
        />

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
            class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            title="Delete"
            :disabled="isPending"
            @click="emit('delete')"
          >
            <Trash2 class="h-4 w-4" />
          </button>
          <button
            v-if="!discussion.isOwner"
            class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            title="Report"
            :disabled="isPending"
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
        class="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        :disabled="isPending"
        @click="emit('reply')"
      >
        <MessageCircle class="h-4 w-4" />
        <span>{{ discussion.replyCount }} {{ discussion.replyCount === 1 ? 'reply' : 'replies' }}</span>
      </button>
    </div>
  </div>
</template>

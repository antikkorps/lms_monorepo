<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { Notification } from '@/composables/useNotifications';
import { useNotifications } from '@/composables/useNotifications';

const props = defineProps<{
  notification: Notification;
}>();

const emit = defineEmits<{
  click: [notification: Notification];
  delete: [id: string];
}>();

const { getNotificationIcon, formatTimeAgo } = useNotifications();

const icon = computed(() => getNotificationIcon(props.notification.type));
const timeAgo = computed(() => formatTimeAgo(props.notification.createdAt));

const handleClick = () => {
  emit('click', props.notification);
};

const handleDelete = () => {
  emit('delete', props.notification.id);
};
</script>

<template>
  <component
    :is="notification.link ? RouterLink : 'div'"
    :to="notification.link || undefined"
    class="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
    :class="{ 'bg-blue-50 dark:bg-blue-900/20': !notification.read }"
    @click="handleClick"
  >
    <div class="flex items-start gap-3">
      <!-- Icon -->
      <div
        class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        :class="{
          'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400':
            notification.type === 'lesson_completed' || notification.type === 'course_completed',
          'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400':
            notification.type === 'quiz_passed',
          'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400':
            notification.type === 'badge_earned',
          'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400':
            notification.type === 'discussion_reply',
          'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400':
            notification.type === 'purchase_confirmed',
        }"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <template v-if="icon === 'check-circle'">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </template>
          <template v-else-if="icon === 'award'">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </template>
          <template v-else-if="icon === 'check-square'">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </template>
          <template v-else-if="icon === 'message-circle'">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </template>
          <template v-else-if="icon === 'shopping-cart'">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </template>
          <template v-else>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </template>
        </svg>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <p
          class="text-sm font-medium text-gray-900 dark:text-gray-100"
          :class="{ 'font-semibold': !notification.read }"
        >
          {{ notification.title }}
        </p>
        <p v-if="notification.message" class="text-sm text-gray-500 dark:text-gray-400 truncate">
          {{ notification.message }}
        </p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {{ timeAgo }}
        </p>
      </div>

      <!-- Unread indicator & delete button -->
      <div class="flex items-center gap-2">
        <span
          v-if="!notification.read"
          class="w-2 h-2 bg-blue-600 rounded-full"
          aria-label="Unread"
        />
        <button
          @click.stop.prevent="handleDelete"
          class="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Delete notification"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  </component>
</template>

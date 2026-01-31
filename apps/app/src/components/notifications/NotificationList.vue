<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useNotifications } from '@/composables/useNotifications';
import NotificationItem from './NotificationItem.vue';

const router = useRouter();
const {
  notifications,
  pagination,
  isLoading,
  error,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = useNotifications();

const filter = ref<'all' | 'unread'>('all');

onMounted(() => {
  fetchNotifications(1, filter.value === 'unread');
});

const loadMore = () => {
  if (pagination.value.page < pagination.value.totalPages) {
    fetchNotifications(pagination.value.page + 1, filter.value === 'unread');
  }
};

const handleFilterChange = (newFilter: 'all' | 'unread') => {
  filter.value = newFilter;
  fetchNotifications(1, newFilter === 'unread');
};

const handleNotificationClick = async (notification: { id: string; link: string | null }) => {
  await markAsRead(notification.id);
  if (notification.link) {
    router.push(notification.link);
  }
};

const hasMore = computed(() => pagination.value.page < pagination.value.totalPages);
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700"
    >
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
      <div class="flex items-center gap-4">
        <!-- Filter -->
        <div class="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
          <button
            @click="handleFilterChange('all')"
            :class="[
              'px-3 py-1 text-sm rounded-md transition-colors',
              filter === 'all'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
            ]"
          >
            All
          </button>
          <button
            @click="handleFilterChange('unread')"
            :class="[
              'px-3 py-1 text-sm rounded-md transition-colors',
              filter === 'unread'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
            ]"
          >
            Unread
          </button>
        </div>

        <!-- Mark all read -->
        <button
          @click="markAllAsRead"
          class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Mark all as read
        </button>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="px-6 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
    >
      {{ error }}
    </div>

    <!-- List -->
    <div class="divide-y divide-gray-100 dark:divide-gray-700">
      <template v-if="isLoading && notifications.length === 0">
        <div class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
          <svg
            class="animate-spin h-8 w-8 mx-auto mb-3 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading notifications...
        </div>
      </template>

      <template v-else-if="notifications.length === 0">
        <div class="px-6 py-12 text-center">
          <svg
            class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            {{ filter === 'unread' ? 'No unread notifications' : 'No notifications yet' }}
          </h3>
          <p class="text-gray-500 dark:text-gray-400">
            {{
              filter === 'unread'
                ? "You're all caught up!"
                : "When you have notifications, they'll appear here."
            }}
          </p>
        </div>
      </template>

      <template v-else>
        <NotificationItem
          v-for="notification in notifications"
          :key="notification.id"
          :notification="notification"
          class="group"
          @click="handleNotificationClick"
          @delete="deleteNotification"
        />
      </template>
    </div>

    <!-- Load More -->
    <div
      v-if="hasMore"
      class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 text-center"
    >
      <button
        @click="loadMore"
        :disabled="isLoading"
        class="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
      >
        {{ isLoading ? 'Loading...' : 'Load more' }}
      </button>
    </div>

    <!-- Pagination Info -->
    <div
      v-if="notifications.length > 0"
      class="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 text-center text-sm text-gray-500 dark:text-gray-400"
    >
      Showing {{ notifications.length }} of {{ pagination.total }} notifications
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useNotifications } from '@/composables/useNotifications';
import NotificationItem from './NotificationItem.vue';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const router = useRouter();
const {
  recentNotifications,
  unreadCount,
  isLoading,
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = useNotifications();

const dropdownRef = ref<HTMLElement | null>(null);

onMounted(() => {
  fetchUnreadCount();
});

watch(
  () => props.show,
  (show) => {
    if (show) {
      fetchNotifications(1);
    }
  }
);

const handleNotificationClick = async (notification: { id: string; link: string | null }) => {
  await markAsRead(notification.id);
  emit('close');
  if (notification.link) {
    router.push(notification.link);
  }
};

const handleMarkAllRead = async () => {
  await markAllAsRead();
};

const handleViewAll = () => {
  emit('close');
  router.push('/notifications');
};
</script>

<template>
  <Transition
    enter-active-class="transition ease-out duration-100"
    enter-from-class="transform opacity-0 scale-95"
    enter-to-class="transform opacity-100 scale-100"
    leave-active-class="transition ease-in duration-75"
    leave-from-class="transform opacity-100 scale-100"
    leave-to-class="transform opacity-0 scale-95"
  >
    <div
      v-if="show"
      ref="dropdownRef"
      class="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
        <button
          v-if="unreadCount > 0"
          @click="handleMarkAllRead"
          class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Mark all as read
        </button>
      </div>

      <!-- Notifications List -->
      <div class="max-h-96 overflow-y-auto">
        <template v-if="isLoading">
          <div class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            <svg
              class="animate-spin h-6 w-6 mx-auto mb-2 text-gray-400"
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
            Loading...
          </div>
        </template>
        <template v-else-if="recentNotifications.length === 0">
          <div class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <p class="text-sm">No notifications yet</p>
          </div>
        </template>
        <template v-else>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            <NotificationItem
              v-for="notification in recentNotifications"
              :key="notification.id"
              :notification="notification"
              class="group"
              @click="handleNotificationClick"
              @delete="deleteNotification"
            />
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div
        class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-center"
      >
        <button
          @click="handleViewAll"
          class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
        >
          View all notifications
        </button>
      </div>
    </div>
  </Transition>
</template>

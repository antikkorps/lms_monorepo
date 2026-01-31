<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useNotifications } from '@/composables/useNotifications';
import NotificationDropdown from './NotificationDropdown.vue';

const { unreadCount, hasUnread, fetchUnreadCount, connectSSE, disconnectSSE } = useNotifications();

const showDropdown = ref(false);
const bellRef = ref<HTMLElement | null>(null);

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const closeDropdown = () => {
  showDropdown.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
  if (bellRef.value && !bellRef.value.contains(event.target as Node)) {
    closeDropdown();
  }
};

onMounted(() => {
  fetchUnreadCount();
  connectSSE();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  disconnectSSE();
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div ref="bellRef" class="relative">
    <button
      @click.stop="toggleDropdown"
      class="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label="Notifications"
    >
      <!-- Bell Icon -->
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      <!-- Unread Badge -->
      <span
        v-if="hasUnread"
        class="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full transform translate-x-1 -translate-y-1"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown -->
    <NotificationDropdown :show="showDropdown" @close="closeDropdown" />
  </div>
</template>

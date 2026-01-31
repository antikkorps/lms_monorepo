<script setup lang="ts">
import { onMounted } from 'vue';
import { useNotificationPreferences } from '@/composables/useNotificationPreferences';
import { useToast } from '@/composables/useToast';

const toast = useToast();
const {
  preferences,
  isLoading,
  isSaving,
  error,
  fetchPreferences,
  toggleEmailEnabled,
  toggleInAppEnabled,
  setDigestFrequency,
  setDigestDay,
  getTypeLabel,
  getDayLabel,
  getFrequencyLabel,
  NOTIFICATION_TYPES,
  DAY_OPTIONS,
  FREQUENCY_OPTIONS,
} = useNotificationPreferences();

onMounted(() => {
  fetchPreferences();
});

const handleToggleEmail = async (type: (typeof NOTIFICATION_TYPES)[number]) => {
  try {
    await toggleEmailEnabled(type);
    toast.success('Email preference updated');
  } catch {
    toast.error('Failed to update preference');
  }
};

const handleToggleInApp = async (type: (typeof NOTIFICATION_TYPES)[number]) => {
  try {
    await toggleInAppEnabled(type);
    toast.success('In-app preference updated');
  } catch {
    toast.error('Failed to update preference');
  }
};

const handleFrequencyChange = async (frequency: 'never' | 'daily' | 'weekly') => {
  try {
    await setDigestFrequency(frequency);
    toast.success('Digest frequency updated');
  } catch {
    toast.error('Failed to update preference');
  }
};

const handleDayChange = async (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const day = parseInt(target.value, 10);
  try {
    await setDigestDay(day);
    toast.success('Digest day updated');
  } catch {
    toast.error('Failed to update preference');
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Notification Settings</h1>
      <p class="text-muted-foreground">Manage how you receive notifications</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <svg class="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
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
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg"
    >
      {{ error }}
    </div>

    <!-- Settings -->
    <template v-else-if="preferences">
      <!-- Notification Types -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Notification Types
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Choose which notifications you want to receive
          </p>
        </div>

        <div class="divide-y divide-gray-100 dark:divide-gray-700">
          <div
            v-for="type in NOTIFICATION_TYPES"
            :key="type"
            class="px-6 py-4 flex items-center justify-between"
          >
            <div class="flex-1">
              <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ getTypeLabel(type) }}
              </h3>
            </div>

            <div class="flex items-center gap-6">
              <!-- Email Toggle -->
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="preferences.emailEnabled[type]"
                  :disabled="isSaving"
                  class="sr-only peer"
                  @change="handleToggleEmail(type)"
                />
                <div
                  class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"
                ></div>
                <span class="text-sm text-gray-600 dark:text-gray-400">Email</span>
              </label>

              <!-- In-App Toggle -->
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="preferences.inAppEnabled[type]"
                  :disabled="isSaving"
                  class="sr-only peer"
                  @change="handleToggleInApp(type)"
                />
                <div
                  class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"
                ></div>
                <span class="text-sm text-gray-600 dark:text-gray-400">In-app</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Email Digest -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Email Digest</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Receive a summary of your notifications
          </p>
        </div>

        <div class="px-6 py-4 space-y-4">
          <!-- Frequency -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frequency
            </label>
            <div class="flex gap-3">
              <button
                v-for="option in FREQUENCY_OPTIONS"
                :key="option.value"
                @click="handleFrequencyChange(option.value)"
                :disabled="isSaving"
                :class="[
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  preferences.digestFrequency === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
                  isSaving ? 'opacity-50 cursor-not-allowed' : '',
                ]"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <!-- Day of Week (only show for weekly) -->
          <div v-if="preferences.digestFrequency === 'weekly'">
            <label
              for="digestDay"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Day of week
            </label>
            <select
              id="digestDay"
              :value="preferences.digestDay"
              :disabled="isSaving"
              @change="handleDayChange"
              class="block w-full max-w-xs px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option v-for="day in DAY_OPTIONS" :key="day.value" :value="day.value">
                {{ day.label }}
              </option>
            </select>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You'll receive your digest every {{ getDayLabel(preferences.digestDay) }} at 8:00 AM
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const password = ref('');
const confirmPassword = ref('');
const localError = ref('');
const resetSuccess = ref(false);
const token = ref('');

onMounted(() => {
  token.value = route.query.token as string || '';
  if (!token.value) {
    localError.value = 'Invalid or missing reset token';
  }
});

async function handleSubmit() {
  localError.value = '';
  authStore.clearError();

  if (password.value !== confirmPassword.value) {
    localError.value = 'Passwords do not match';
    return;
  }

  if (password.value.length < 8) {
    localError.value = 'Password must be at least 8 characters';
    return;
  }

  const success = await authStore.resetPassword(token.value, password.value);
  if (success) {
    resetSuccess.value = true;
    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gray-50">
    <div class="card w-full max-w-md">
      <h1 class="text-2xl font-bold text-center mb-6">Set New Password</h1>

      <!-- Success message -->
      <div v-if="resetSuccess" class="text-center">
        <div class="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">
          <h2 class="font-semibold mb-2">Password Reset Successful</h2>
          <p class="text-sm">
            Your password has been updated. Redirecting to sign in...
          </p>
        </div>
        <router-link to="/login" class="text-primary-600 hover:text-primary-500 font-medium">
          Sign In Now
        </router-link>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <div v-if="authStore.error || localError" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {{ authStore.error || localError }}
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="input"
            placeholder="••••••••"
            required
            minlength="8"
            :disabled="authStore.isLoading || !token"
          />
          <p class="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            class="input"
            placeholder="••••••••"
            required
            :disabled="authStore.isLoading || !token"
          />
        </div>

        <button
          type="submit"
          class="btn-primary w-full"
          :disabled="authStore.isLoading || !token"
        >
          {{ authStore.isLoading ? 'Resetting...' : 'Reset Password' }}
        </button>

        <p class="text-center">
          <router-link to="/login" class="text-sm text-gray-600 hover:text-gray-500">
            Back to Sign In
          </router-link>
        </p>
      </form>
    </div>
  </div>
</template>

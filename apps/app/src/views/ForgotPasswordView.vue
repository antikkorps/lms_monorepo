<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const email = ref('');
const submitted = ref(false);

async function handleSubmit() {
  authStore.clearError();

  const success = await authStore.forgotPassword(email.value);
  if (success) {
    submitted.value = true;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gray-50">
    <div class="card w-full max-w-md">
      <h1 class="text-2xl font-bold text-center mb-2">Reset Password</h1>
      <p class="text-center text-gray-600 mb-6">
        Enter your email and we'll send you a link to reset your password.
      </p>

      <!-- Success message -->
      <div v-if="submitted" class="text-center">
        <div class="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">
          <h2 class="font-semibold mb-2">Check your email</h2>
          <p class="text-sm">
            If an account exists for <strong>{{ email }}</strong>,
            you will receive a password reset link shortly.
          </p>
        </div>
        <router-link to="/login" class="text-primary-600 hover:text-primary-500 font-medium">
          Back to Sign In
        </router-link>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <div v-if="authStore.error" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {{ authStore.error }}
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="input"
            placeholder="you@example.com"
            required
            :disabled="authStore.isLoading"
          />
        </div>

        <button
          type="submit"
          class="btn-primary w-full"
          :disabled="authStore.isLoading"
        >
          {{ authStore.isLoading ? 'Sending...' : 'Send Reset Link' }}
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

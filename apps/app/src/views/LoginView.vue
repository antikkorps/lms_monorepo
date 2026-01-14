<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const error = ref('');

async function handleSubmit() {
  isLoading.value = true;
  error.value = '';

  try {
    // TODO: Implement actual login logic
    console.log('Login attempt:', { email: email.value });

    // Redirect to intended destination or dashboard
    const redirect = route.query.redirect as string;
    await router.push(redirect || '/dashboard');
  } catch (e) {
    error.value = 'Invalid credentials. Please try again.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gray-50">
    <div class="card w-full max-w-md">
      <h1 class="text-2xl font-bold text-center mb-6">Sign In</h1>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div v-if="error" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {{ error }}
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
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="input"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          class="btn-primary w-full"
          :disabled="isLoading"
        >
          {{ isLoading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>
    </div>
  </div>
</template>

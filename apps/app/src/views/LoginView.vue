<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');

async function handleSubmit() {
  authStore.clearError();

  const success = await authStore.login({
    email: email.value,
    password: password.value,
  });

  if (success) {
    const redirect = route.query.redirect as string;
    await router.push(redirect || '/dashboard');
  }
}

async function handleSSOLogin(provider: 'google' | 'microsoft') {
  const authUrl = await authStore.getSSOAuthUrl(provider);
  if (authUrl) {
    window.location.href = authUrl;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gray-50">
    <div class="card w-full max-w-md">
      <h1 class="text-2xl font-bold text-center mb-6">Sign In</h1>

      <form @submit.prevent="handleSubmit" class="space-y-4">
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
            :disabled="authStore.isLoading"
          />
        </div>

        <div class="flex justify-end">
          <router-link to="/forgot-password" class="text-sm text-primary-600 hover:text-primary-500">
            Forgot password?
          </router-link>
        </div>

        <button
          type="submit"
          class="btn-primary w-full"
          :disabled="authStore.isLoading"
        >
          {{ authStore.isLoading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            @click="handleSSOLogin('google')"
            class="btn-secondary flex items-center justify-center gap-2"
            :disabled="authStore.isLoading"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          <button
            type="button"
            @click="handleSSOLogin('microsoft')"
            class="btn-secondary flex items-center justify-center gap-2"
            :disabled="authStore.isLoading"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
            </svg>
            Microsoft
          </button>
        </div>
      </div>

      <p class="mt-6 text-center text-sm text-gray-600">
        Don't have an account?
        <router-link to="/register" class="text-primary-600 hover:text-primary-500 font-medium">
          Sign up
        </router-link>
      </p>
    </div>
  </div>
</template>

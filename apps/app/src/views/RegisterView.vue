<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const firstName = ref('');
const lastName = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const localError = ref('');
const registrationSuccess = ref(false);

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

  const success = await authStore.register({
    firstName: firstName.value,
    lastName: lastName.value,
    email: email.value,
    password: password.value,
  });

  if (success) {
    registrationSuccess.value = true;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gray-50">
    <div class="card w-full max-w-md">
      <h1 class="text-2xl font-bold text-center mb-6">Create Account</h1>

      <!-- Success message -->
      <div v-if="registrationSuccess" class="text-center">
        <div class="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">
          <h2 class="font-semibold mb-2">Check your email</h2>
          <p class="text-sm">
            We've sent a verification link to <strong>{{ email }}</strong>.
            Please check your inbox and click the link to activate your account.
          </p>
        </div>
        <router-link to="/login" class="text-primary-600 hover:text-primary-500 font-medium">
          Back to Sign In
        </router-link>
      </div>

      <!-- Registration form -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <div v-if="authStore.error || localError" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {{ authStore.error || localError }}
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              id="firstName"
              v-model="firstName"
              type="text"
              class="input"
              required
              :disabled="authStore.isLoading"
            />
          </div>
          <div>
            <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              id="lastName"
              v-model="lastName"
              type="text"
              class="input"
              required
              :disabled="authStore.isLoading"
            />
          </div>
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
            minlength="8"
            :disabled="authStore.isLoading"
          />
          <p class="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            class="input"
            placeholder="••••••••"
            required
            :disabled="authStore.isLoading"
          />
        </div>

        <button
          type="submit"
          class="btn-primary w-full"
          :disabled="authStore.isLoading"
        >
          {{ authStore.isLoading ? 'Creating account...' : 'Create Account' }}
        </button>
      </form>

      <p v-if="!registrationSuccess" class="mt-6 text-center text-sm text-gray-600">
        Already have an account?
        <router-link to="/login" class="text-primary-600 hover:text-primary-500 font-medium">
          Sign in
        </router-link>
      </p>
    </div>
  </div>
</template>

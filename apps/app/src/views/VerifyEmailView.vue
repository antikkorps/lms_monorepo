<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const verificationStatus = ref<'verifying' | 'success' | 'error'>('verifying');
const token = ref('');

onMounted(async () => {
  token.value = route.query.token as string || '';

  if (!token.value) {
    verificationStatus.value = 'error';
    authStore.error = 'Invalid or missing verification token';
    return;
  }

  const success = await authStore.verifyEmail(token.value);
  verificationStatus.value = success ? 'success' : 'error';

  if (success) {
    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  }
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gray-50">
    <div class="card w-full max-w-md text-center">
      <!-- Verifying -->
      <div v-if="verificationStatus === 'verifying'">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <h1 class="text-xl font-semibold text-gray-700">Verifying your email...</h1>
      </div>

      <!-- Success -->
      <div v-else-if="verificationStatus === 'success'">
        <div class="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">
          <svg class="w-12 h-12 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <h2 class="font-semibold text-lg mb-2">Email Verified!</h2>
          <p class="text-sm">
            Your email has been verified successfully. Redirecting to sign in...
          </p>
        </div>
        <router-link to="/login" class="text-primary-600 hover:text-primary-500 font-medium">
          Sign In Now
        </router-link>
      </div>

      <!-- Error -->
      <div v-else>
        <div class="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          <svg class="w-12 h-12 mx-auto mb-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <h2 class="font-semibold text-lg mb-2">Verification Failed</h2>
          <p class="text-sm">
            {{ authStore.error || 'Unable to verify your email. The link may have expired.' }}
          </p>
        </div>
        <div class="space-y-2">
          <router-link to="/login" class="block text-primary-600 hover:text-primary-500 font-medium">
            Sign In
          </router-link>
          <p class="text-sm text-gray-500">
            Need a new verification link? Sign in and request a new one.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

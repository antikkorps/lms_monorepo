<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-vue-next';

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
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  }
}
</script>

<template>
  <Card>
    <CardHeader class="text-center">
      <CardTitle class="text-2xl">Set New Password</CardTitle>
      <CardDescription>Enter your new password below</CardDescription>
    </CardHeader>
    <CardContent>
      <!-- Success message -->
      <div v-if="resetSuccess" class="text-center space-y-4">
        <Alert class="border-green-500 bg-green-50 text-green-700">
          <CheckCircle class="h-4 w-4" />
          <AlertTitle>Password Reset Successful</AlertTitle>
          <AlertDescription>
            Your password has been updated. Redirecting to sign in...
          </AlertDescription>
        </Alert>
        <RouterLink to="/login">
          <Button variant="link">Sign In Now</Button>
        </RouterLink>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <Alert v-if="authStore.error || localError" variant="destructive">
          <AlertDescription>{{ authStore.error || localError }}</AlertDescription>
        </Alert>

        <div class="space-y-2">
          <Label for="password">New Password</Label>
          <Input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            minlength="8"
            :disabled="authStore.isLoading || !token"
          />
          <p class="text-xs text-muted-foreground">Minimum 8 characters</p>
        </div>

        <div class="space-y-2">
          <Label for="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            :disabled="authStore.isLoading || !token"
          />
        </div>

        <Button
          type="submit"
          class="w-full"
          :disabled="authStore.isLoading || !token"
        >
          {{ authStore.isLoading ? 'Resetting...' : 'Reset Password' }}
        </Button>

        <p class="text-center">
          <RouterLink to="/login" class="text-sm text-muted-foreground hover:text-foreground">
            Back to Sign In
          </RouterLink>
        </p>
      </form>
    </CardContent>
  </Card>
</template>

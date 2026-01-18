<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail } from 'lucide-vue-next';

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
  <Card>
    <CardHeader class="text-center">
      <CardTitle class="text-2xl">Reset Password</CardTitle>
      <CardDescription>
        Enter your email and we'll send you a link to reset your password.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <!-- Success message -->
      <div v-if="submitted" class="text-center space-y-4">
        <Alert class="border-green-500 bg-green-50 text-green-700">
          <Mail class="h-4 w-4" />
          <AlertTitle>Check your email</AlertTitle>
          <AlertDescription>
            If an account exists for <strong>{{ email }}</strong>,
            you will receive a password reset link shortly.
          </AlertDescription>
        </Alert>
        <RouterLink to="/login">
          <Button variant="link">Back to Sign In</Button>
        </RouterLink>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <Alert v-if="authStore.error" variant="destructive">
          <AlertDescription>{{ authStore.error }}</AlertDescription>
        </Alert>

        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
            :disabled="authStore.isLoading"
          />
        </div>

        <Button
          type="submit"
          class="w-full"
          :disabled="authStore.isLoading"
        >
          {{ authStore.isLoading ? 'Sending...' : 'Send Reset Link' }}
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

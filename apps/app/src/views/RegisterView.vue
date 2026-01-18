<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-vue-next';

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
  <Card>
    <CardHeader class="text-center">
      <CardTitle class="text-2xl">Create Account</CardTitle>
      <CardDescription>Enter your details to get started</CardDescription>
    </CardHeader>
    <CardContent>
      <!-- Success message -->
      <div v-if="registrationSuccess" class="text-center space-y-4">
        <Alert class="border-green-500 bg-green-50 text-green-700">
          <CheckCircle class="h-4 w-4" />
          <AlertTitle>Check your email</AlertTitle>
          <AlertDescription>
            We've sent a verification link to <strong>{{ email }}</strong>.
            Please check your inbox and click the link to activate your account.
          </AlertDescription>
        </Alert>
        <RouterLink to="/login">
          <Button variant="link">Back to Sign In</Button>
        </RouterLink>
      </div>

      <!-- Registration form -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <Alert v-if="authStore.error || localError" variant="destructive">
          <AlertDescription>{{ authStore.error || localError }}</AlertDescription>
        </Alert>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="firstName">First Name</Label>
            <Input
              id="firstName"
              v-model="firstName"
              type="text"
              required
              :disabled="authStore.isLoading"
            />
          </div>
          <div class="space-y-2">
            <Label for="lastName">Last Name</Label>
            <Input
              id="lastName"
              v-model="lastName"
              type="text"
              required
              :disabled="authStore.isLoading"
            />
          </div>
        </div>

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

        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            minlength="8"
            :disabled="authStore.isLoading"
          />
          <p class="text-xs text-muted-foreground">Minimum 8 characters</p>
        </div>

        <div class="space-y-2">
          <Label for="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            :disabled="authStore.isLoading"
          />
        </div>

        <Button
          type="submit"
          class="w-full"
          :disabled="authStore.isLoading"
        >
          {{ authStore.isLoading ? 'Creating account...' : 'Create Account' }}
        </Button>
      </form>

      <p v-if="!registrationSuccess" class="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?
        <RouterLink to="/login" class="font-medium text-primary hover:underline">
          Sign in
        </RouterLink>
      </p>
    </CardContent>
  </Card>
</template>

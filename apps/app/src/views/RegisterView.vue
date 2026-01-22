<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-vue-next';

const { t } = useI18n();
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
    localError.value = t('auth.register.errors.passwordMismatch');
    return;
  }

  if (password.value.length < 8) {
    localError.value = t('auth.register.errors.passwordTooShort');
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
      <CardTitle class="text-2xl">{{ t('auth.register.title') }}</CardTitle>
      <CardDescription>{{ t('auth.register.subtitle') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <!-- Success message -->
      <div v-if="registrationSuccess" class="text-center space-y-4">
        <Alert class="border-green-500 bg-green-50 text-green-700">
          <CheckCircle class="h-4 w-4" />
          <AlertTitle>{{ t('auth.register.success.title') }}</AlertTitle>
          <AlertDescription>
            {{ t('auth.register.success.message', { email }) }}
          </AlertDescription>
        </Alert>
        <RouterLink to="/login">
          <Button variant="link">{{ t('auth.register.backToSignIn') }}</Button>
        </RouterLink>
      </div>

      <!-- Registration form -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <Alert v-if="authStore.error || localError" variant="destructive">
          <AlertDescription>{{ authStore.error || localError }}</AlertDescription>
        </Alert>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="firstName">{{ t('auth.register.firstName') }}</Label>
            <Input
              id="firstName"
              v-model="firstName"
              type="text"
              required
              :disabled="authStore.isLoading"
            />
          </div>
          <div class="space-y-2">
            <Label for="lastName">{{ t('auth.register.lastName') }}</Label>
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
          <Label for="email">{{ t('auth.register.email') }}</Label>
          <Input
            id="email"
            v-model="email"
            type="email"
            :placeholder="t('auth.register.emailPlaceholder')"
            required
            :disabled="authStore.isLoading"
          />
        </div>

        <div class="space-y-2">
          <Label for="password">{{ t('auth.register.password') }}</Label>
          <Input
            id="password"
            v-model="password"
            type="password"
            :placeholder="t('auth.register.passwordPlaceholder')"
            required
            minlength="8"
            :disabled="authStore.isLoading"
          />
          <p class="text-xs text-muted-foreground">{{ t('auth.register.passwordHint') }}</p>
        </div>

        <div class="space-y-2">
          <Label for="confirmPassword">{{ t('auth.register.confirmPassword') }}</Label>
          <Input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            :placeholder="t('auth.register.passwordPlaceholder')"
            required
            :disabled="authStore.isLoading"
          />
        </div>

        <Button
          type="submit"
          class="w-full"
          :disabled="authStore.isLoading"
        >
          {{ authStore.isLoading ? t('auth.register.submitting') : t('auth.register.submit') }}
        </Button>
      </form>

      <p v-if="!registrationSuccess" class="mt-6 text-center text-sm text-muted-foreground">
        {{ t('auth.register.hasAccount') }}
        <RouterLink to="/login" class="font-medium text-primary hover:underline">
          {{ t('auth.register.signInLink') }}
        </RouterLink>
      </p>
    </CardContent>
  </Card>
</template>

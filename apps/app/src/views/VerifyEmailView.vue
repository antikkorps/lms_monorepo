<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-vue-next';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const verificationStatus = ref<'verifying' | 'success' | 'error'>('verifying');
const token = ref('');

onMounted(async () => {
  token.value = route.query.token as string || '';

  if (!token.value) {
    verificationStatus.value = 'error';
    authStore.error = t('auth.verifyEmail.errors.invalidToken');
    return;
  }

  const success = await authStore.verifyEmail(token.value);
  verificationStatus.value = success ? 'success' : 'error';

  if (success) {
    // Store loads user from verify response — redirect to dashboard or login
    setTimeout(() => {
      router.push(authStore.isAuthenticated ? '/dashboard' : '/login');
    }, 2000);
  }
});
</script>

<template>
  <Card>
    <CardHeader class="text-center">
      <CardTitle class="text-2xl">{{ t('auth.verifyEmail.title') }}</CardTitle>
    </CardHeader>
    <CardContent class="text-center">
      <!-- Verifying -->
      <div v-if="verificationStatus === 'verifying'" class="space-y-4">
        <Loader2 class="h-12 w-12 mx-auto animate-spin text-primary" />
        <p class="text-muted-foreground">{{ t('auth.verifyEmail.verifying') }}</p>
      </div>

      <!-- Success -->
      <div v-else-if="verificationStatus === 'success'" class="space-y-4">
        <Alert class="border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
          <CheckCircle class="h-4 w-4" />
          <AlertTitle>{{ t('auth.verifyEmail.success.title') }}</AlertTitle>
          <AlertDescription>
            {{ t('auth.verifyEmail.success.message') }}
          </AlertDescription>
        </Alert>
        <RouterLink to="/dashboard">
          <Button variant="link">{{ t('auth.login.submit') }}</Button>
        </RouterLink>
      </div>

      <!-- Error -->
      <div v-else class="space-y-4">
        <Alert variant="destructive">
          <XCircle class="h-4 w-4" />
          <AlertTitle>{{ t('auth.verifyEmail.errors.invalidToken') }}</AlertTitle>
          <AlertDescription>
            {{ authStore.error || t('auth.verifyEmail.errors.invalidToken') }}
          </AlertDescription>
        </Alert>
        <div class="space-y-2">
          <RouterLink to="/login">
            <Button variant="link">{{ t('auth.login.submit') }}</Button>
          </RouterLink>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

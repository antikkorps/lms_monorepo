<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-vue-next';

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
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  }
});
</script>

<template>
  <Card>
    <CardHeader class="text-center">
      <CardTitle class="text-2xl">Email Verification</CardTitle>
    </CardHeader>
    <CardContent class="text-center">
      <!-- Verifying -->
      <div v-if="verificationStatus === 'verifying'" class="space-y-4">
        <Loader2 class="h-12 w-12 mx-auto animate-spin text-primary" />
        <p class="text-muted-foreground">Verifying your email...</p>
      </div>

      <!-- Success -->
      <div v-else-if="verificationStatus === 'success'" class="space-y-4">
        <Alert class="border-green-500 bg-green-50 text-green-700">
          <CheckCircle class="h-4 w-4" />
          <AlertTitle>Email Verified!</AlertTitle>
          <AlertDescription>
            Your email has been verified successfully. Redirecting to sign in...
          </AlertDescription>
        </Alert>
        <RouterLink to="/login">
          <Button variant="link">Sign In Now</Button>
        </RouterLink>
      </div>

      <!-- Error -->
      <div v-else class="space-y-4">
        <Alert variant="destructive">
          <XCircle class="h-4 w-4" />
          <AlertTitle>Verification Failed</AlertTitle>
          <AlertDescription>
            {{ authStore.error || 'Unable to verify your email. The link may have expired.' }}
          </AlertDescription>
        </Alert>
        <div class="space-y-2">
          <RouterLink to="/login">
            <Button variant="link">Sign In</Button>
          </RouterLink>
          <p class="text-sm text-muted-foreground">
            Need a new verification link? Sign in and request a new one.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

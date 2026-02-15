<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useApi } from '@/composables/useApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Building2, Shield } from 'lucide-vue-next';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const api = useApi();

interface InvitationData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantName: string;
  expiresAt: string;
  isExpired: boolean;
  status: string;
}

const status = ref<'loading' | 'form' | 'submitting' | 'success' | 'error'>('loading');
const invitation = ref<InvitationData | null>(null);
const error = ref('');
const password = ref('');
const confirmPassword = ref('');
const formError = ref('');

const token = route.params.token as string;

onMounted(async () => {
  if (!token) {
    status.value = 'error';
    error.value = t('auth.acceptInvitation.errors.invalidToken');
    return;
  }

  try {
    const result = await api.get<InvitationData>(`/invitations/${token}`);
    invitation.value = result;

    if (result.isExpired || result.status === 'expired') {
      status.value = 'error';
      error.value = t('auth.acceptInvitation.errors.tokenExpired');
    } else if (result.status !== 'pending') {
      status.value = 'error';
      error.value = t('auth.acceptInvitation.errors.alreadyAccepted');
    } else {
      status.value = 'form';
    }
  } catch {
    status.value = 'error';
    error.value = t('auth.acceptInvitation.errors.invalidToken');
  }
});

async function handleSubmit() {
  formError.value = '';

  if (password.value.length < 8) {
    formError.value = t('auth.acceptInvitation.errors.passwordTooShort');
    return;
  }

  if (password.value !== confirmPassword.value) {
    formError.value = t('auth.acceptInvitation.errors.passwordMismatch');
    return;
  }

  status.value = 'submitting';

  try {
    await api.post(`/invitations/${token}/accept`, { password: password.value });
    status.value = 'success';
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  } catch (err: unknown) {
    status.value = 'form';
    const apiError = err as { message?: string };
    formError.value = apiError.message || t('auth.acceptInvitation.errors.failed');
  }
}

const roleLabels: Record<string, string> = {
  learner: 'Learner',
  instructor: 'Instructor',
  manager: 'Manager',
  tenant_admin: 'Administrator',
};
</script>

<template>
  <Card class="w-full max-w-md mx-auto">
    <CardHeader class="text-center">
      <CardTitle class="text-2xl">{{ t('auth.acceptInvitation.title') }}</CardTitle>
      <CardDescription v-if="status === 'form' && invitation">
        {{ t('auth.acceptInvitation.subtitle') }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <!-- Loading -->
      <div v-if="status === 'loading'" class="text-center space-y-4 py-8">
        <Loader2 class="h-12 w-12 mx-auto animate-spin text-primary" />
        <p class="text-muted-foreground">{{ t('auth.acceptInvitation.loading') }}</p>
      </div>

      <!-- Form -->
      <div v-else-if="status === 'form' || status === 'submitting'">
        <!-- Invitation details -->
        <div v-if="invitation" class="mb-6 rounded-lg border p-4 space-y-2">
          <div class="flex items-center gap-2 text-sm">
            <Building2 class="h-4 w-4 text-muted-foreground" />
            <span class="font-medium">{{ invitation.tenantName }}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <Shield class="h-4 w-4 text-muted-foreground" />
            <span>{{ t('auth.acceptInvitation.roleLabel') }}: <strong>{{ roleLabels[invitation.role] || invitation.role }}</strong></span>
          </div>
          <p class="text-sm text-muted-foreground">
            {{ invitation.firstName }} {{ invitation.lastName }} ({{ invitation.email }})
          </p>
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <Alert v-if="formError" variant="destructive">
            <XCircle class="h-4 w-4" />
            <AlertDescription>{{ formError }}</AlertDescription>
          </Alert>

          <div class="space-y-2">
            <Label for="password">{{ t('auth.acceptInvitation.password') }}</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              :placeholder="t('auth.register.passwordPlaceholder')"
              :disabled="status === 'submitting'"
              required
            />
            <p class="text-xs text-muted-foreground">{{ t('auth.acceptInvitation.passwordHint') }}</p>
          </div>

          <div class="space-y-2">
            <Label for="confirmPassword">{{ t('auth.acceptInvitation.confirmPassword') }}</Label>
            <Input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              :placeholder="t('auth.register.passwordPlaceholder')"
              :disabled="status === 'submitting'"
              required
            />
          </div>

          <Button type="submit" class="w-full" :disabled="status === 'submitting'">
            <Loader2 v-if="status === 'submitting'" class="mr-2 h-4 w-4 animate-spin" />
            {{ status === 'submitting' ? t('auth.acceptInvitation.accepting') : t('auth.acceptInvitation.submit') }}
          </Button>
        </form>
      </div>

      <!-- Success -->
      <div v-else-if="status === 'success'" class="space-y-4 text-center">
        <Alert class="border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
          <CheckCircle class="h-4 w-4" />
          <AlertTitle>{{ t('auth.acceptInvitation.success.title') }}</AlertTitle>
          <AlertDescription>{{ t('auth.acceptInvitation.success.message') }}</AlertDescription>
        </Alert>
        <RouterLink to="/login">
          <Button variant="link">{{ t('auth.login.submit') }}</Button>
        </RouterLink>
      </div>

      <!-- Error -->
      <div v-else class="space-y-4 text-center">
        <Alert variant="destructive">
          <XCircle class="h-4 w-4" />
          <AlertTitle>{{ t('auth.acceptInvitation.errors.title') }}</AlertTitle>
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
        <RouterLink to="/login">
          <Button variant="link">{{ t('auth.login.submit') }}</Button>
        </RouterLink>
      </div>
    </CardContent>
  </Card>
</template>

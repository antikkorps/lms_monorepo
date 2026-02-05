<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Building2, Loader2 } from 'lucide-vue-next';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const email = ref('');
const password = ref('');

// Tenant SSO state
const tenantSlug = computed(() => route.query.tenant as string | undefined);
const tenantProvider = ref<{ type: string; name: string } | null>(null);
const isLoadingTenant = ref(false);

// Check if we're in tenant SSO mode
const isTenantMode = computed(() => !!tenantSlug.value && !!tenantProvider.value);

async function handleSubmit() {
  authStore.clearError();

  const success = await authStore.login({
    email: email.value,
    password: password.value,
  });

  if (success) {
    toast.success(t('auth.login.welcomeBack'));
    const redirect = route.query.redirect as string;
    await router.push(redirect || '/dashboard');
  }
}

async function handleSSOLogin(provider: 'google' | 'microsoft' | 'oidc') {
  const authUrl = await authStore.getSSOAuthUrl(provider, tenantSlug.value);
  if (authUrl) {
    window.location.href = authUrl;
  }
}

async function handleTenantSSOLogin() {
  if (!tenantProvider.value) return;

  const authUrl = await authStore.getSSOAuthUrl(
    tenantProvider.value.type as 'google' | 'microsoft' | 'oidc',
    tenantSlug.value,
  );
  if (authUrl) {
    window.location.href = authUrl;
  }
}

// Load tenant SSO config on mount if tenant param exists
onMounted(async () => {
  if (tenantSlug.value) {
    isLoadingTenant.value = true;
    try {
      const providers = await authStore.getTenantSSOProviders(tenantSlug.value);
      if (providers && providers.length > 0) {
        // Use the first enabled provider (tenant should have only one configured)
        const enabledProvider = providers.find((p) => p.enabled);
        if (enabledProvider) {
          tenantProvider.value = {
            type: enabledProvider.type,
            name: enabledProvider.name,
          };
        }
      }
    } catch {
      // Silently fail - will show regular login
    } finally {
      isLoadingTenant.value = false;
    }
  }
});
</script>

<template>
  <Card>
    <CardHeader class="text-center">
      <CardTitle class="text-2xl">{{ t('auth.login.title') }}</CardTitle>
      <CardDescription>
        {{ isTenantMode ? t('auth.login.tenantSubtitle') : t('auth.login.subtitle') }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <!-- Loading tenant config -->
      <div v-if="tenantSlug && isLoadingTenant" class="flex flex-col items-center justify-center py-8">
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
        <p class="mt-2 text-sm text-muted-foreground">{{ t('auth.login.loadingTenant') }}</p>
      </div>

      <!-- Tenant SSO Mode -->
      <div v-else-if="isTenantMode" class="space-y-4">
        <Alert v-if="authStore.error" variant="destructive">
          <AlertDescription>{{ authStore.error }}</AlertDescription>
        </Alert>

        <div class="text-center py-4">
          <Building2 class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p class="text-sm text-muted-foreground mb-6">
            {{ t('auth.login.tenantSSODescription') }}
          </p>
        </div>

        <Button
          type="button"
          class="w-full"
          size="lg"
          @click="handleTenantSSOLogin"
          :disabled="authStore.isLoading"
        >
          <template v-if="authStore.isLoading">
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {{ t('auth.login.redirecting') }}
          </template>
          <template v-else>
            {{ t('auth.login.continueWithSSO', { provider: tenantProvider?.name || 'Enterprise' }) }}
          </template>
        </Button>

        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <Separator class="w-full" />
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-card px-2 text-muted-foreground">{{ t('auth.login.or') }}</span>
          </div>
        </div>

        <p class="text-center text-sm text-muted-foreground">
          {{ t('auth.login.notFromOrganization') }}
          <RouterLink :to="{ name: 'login' }" class="font-medium text-primary hover:underline">
            {{ t('auth.login.loginRegularly') }}
          </RouterLink>
        </p>
      </div>

      <!-- Standard Login Mode -->
      <template v-else>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <Alert v-if="authStore.error" variant="destructive">
            <AlertDescription>{{ authStore.error }}</AlertDescription>
          </Alert>

          <div class="space-y-2">
            <Label for="email">{{ t('auth.login.email') }}</Label>
            <Input
              id="email"
              v-model="email"
              type="email"
              :placeholder="t('auth.login.emailPlaceholder')"
              required
              :disabled="authStore.isLoading"
            />
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="password">{{ t('auth.login.password') }}</Label>
              <RouterLink
                to="/forgot-password"
                class="text-sm text-primary hover:underline"
              >
                {{ t('auth.login.forgotPassword') }}
              </RouterLink>
            </div>
            <Input
              id="password"
              v-model="password"
              type="password"
              :placeholder="t('auth.login.passwordPlaceholder')"
              required
              :disabled="authStore.isLoading"
            />
          </div>

          <Button
            type="submit"
            class="w-full"
            :disabled="authStore.isLoading"
          >
            {{ authStore.isLoading ? t('auth.login.submitting') : t('auth.login.submit') }}
          </Button>
        </form>

        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <Separator class="w-full" />
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-card px-2 text-muted-foreground">{{ t('auth.login.orContinueWith') }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            @click="handleSSOLogin('google')"
            :disabled="authStore.isLoading"
          >
            <svg class="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {{ t('auth.sso.google') }}
          </Button>
          <Button
            type="button"
            variant="outline"
            @click="handleSSOLogin('microsoft')"
            :disabled="authStore.isLoading"
          >
            <svg class="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="currentColor" d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
            </svg>
            {{ t('auth.sso.microsoft') }}
          </Button>
        </div>

        <p class="mt-6 text-center text-sm text-muted-foreground">
          {{ t('auth.login.noAccount') }}
          <RouterLink to="/register" class="font-medium text-primary hover:underline">
            {{ t('auth.login.signUpLink') }}
          </RouterLink>
        </p>
      </template>
    </CardContent>
  </Card>
</template>

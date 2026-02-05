<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Key,
  Loader2,
  Shield,
  XCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { apiClient, ApiRequestError } from '@/composables/useApi';

const { t } = useI18n();

// State
const isLoading = ref(true);
const isSaving = ref(false);
const isTesting = ref(false);
const isDeleting = ref(false);
const error = ref<string | null>(null);

// SSO Configuration
const ssoEnabled = ref(false);
const provider = ref<'google' | 'microsoft' | 'oidc' | ''>('');
const clientId = ref('');
const clientSecret = ref('');
const issuer = ref('');
const tenantId = ref('');
const loginUrl = ref<string | null>(null);
const redirectUri = ref<string>('');

// Test results
const testResults = ref<{
  overall: boolean;
  discovery: { success: boolean; error?: string; endpoints?: Record<string, string> };
} | null>(null);

// Confirm disable dialog
const showDisableDialog = ref(false);

// Computed
const isFormValid = computed(() => {
  if (!provider.value) return false;
  if (!clientId.value.trim()) return false;
  if (!clientSecret.value.trim()) return false;
  if (provider.value === 'oidc' && !issuer.value.trim()) return false;
  if (provider.value === 'microsoft' && !tenantId.value.trim()) return false;
  return true;
});

// Load current SSO configuration
async function loadSSOConfig() {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await apiClient.get<{
      enabled: boolean;
      provider?: 'google' | 'microsoft' | 'oidc';
      clientId?: string;
      issuer?: string;
      tenantId?: string;
      loginUrl?: string | null;
      redirectUri?: string;
    }>('/tenant/sso');

    ssoEnabled.value = response.enabled;
    provider.value = response.provider || '';
    clientId.value = response.clientId || '';
    issuer.value = response.issuer || '';
    tenantId.value = response.tenantId || '';
    loginUrl.value = response.loginUrl || null;
    redirectUri.value = response.redirectUri || '';
    // Don't populate clientSecret - it's never returned
    clientSecret.value = '';
  } catch (err) {
    if (err instanceof ApiRequestError) {
      error.value = err.message;
    } else {
      error.value = t('admin.sso.error.loadFailed');
    }
  } finally {
    isLoading.value = false;
  }
}

// Test SSO configuration
async function testConfiguration() {
  if (!isFormValid.value) return;

  isTesting.value = true;
  testResults.value = null;

  try {
    const response = await apiClient.post<{
      overall: boolean;
      discovery: { success: boolean; error?: string; endpoints?: Record<string, string> };
    }>('/tenant/sso/test', {
      provider: provider.value,
      clientId: clientId.value,
      clientSecret: clientSecret.value,
      ...(issuer.value && { issuer: issuer.value }),
      ...(tenantId.value && { tenantId: tenantId.value }),
    });

    testResults.value = response;

    if (response.overall) {
      toast.success(t('admin.sso.toast.testSuccess'));
    } else {
      toast.error(t('admin.sso.toast.testFailed', { error: response.discovery.error || 'Unknown error' }));
    }
  } catch (err) {
    if (err instanceof ApiRequestError) {
      toast.error(t('admin.sso.toast.testFailed', { error: err.message }));
    } else {
      toast.error(t('admin.sso.error.testFailed'));
    }
  } finally {
    isTesting.value = false;
  }
}

// Save SSO configuration
async function saveConfiguration() {
  if (!isFormValid.value) return;

  isSaving.value = true;

  try {
    const response = await apiClient.put<{
      enabled: boolean;
      provider?: string;
      clientId?: string;
      loginUrl?: string | null;
    }>('/tenant/sso', {
      enabled: true,
      config: {
        provider: provider.value,
        clientId: clientId.value,
        clientSecret: clientSecret.value,
        ...(issuer.value && { issuer: issuer.value }),
        ...(tenantId.value && { tenantId: tenantId.value }),
      },
    });

    ssoEnabled.value = true;
    loginUrl.value = response.loginUrl || null;
    toast.success(t('admin.sso.toast.saved'));
  } catch (err) {
    if (err instanceof ApiRequestError) {
      toast.error(err.message);
    } else {
      toast.error(t('admin.sso.error.saveFailed'));
    }
  } finally {
    isSaving.value = false;
  }
}

// Disable SSO
async function disableSSO() {
  isDeleting.value = true;

  try {
    await apiClient.delete('/tenant/sso');

    ssoEnabled.value = false;
    loginUrl.value = null;
    provider.value = '';
    clientId.value = '';
    clientSecret.value = '';
    issuer.value = '';
    tenantId.value = '';
    testResults.value = null;
    showDisableDialog.value = false;

    toast.success(t('admin.sso.toast.disabled'));
  } catch (err) {
    if (err instanceof ApiRequestError) {
      toast.error(err.message);
    } else {
      toast.error(t('admin.sso.error.deleteFailed'));
    }
  } finally {
    isDeleting.value = false;
  }
}

// Copy login URL to clipboard
async function copyLoginUrl() {
  if (!loginUrl.value) return;

  try {
    await navigator.clipboard.writeText(loginUrl.value);
    toast.success(t('admin.sso.loginUrl.copied'));
  } catch {
    toast.error('Failed to copy URL');
  }
}

// Reset test results when config changes
watch([provider, clientId, clientSecret, issuer, tenantId], () => {
  testResults.value = null;
});

onMounted(() => {
  loadSSOConfig();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">{{ t('admin.sso.title') }}</h1>
        <p class="text-muted-foreground">{{ t('admin.sso.subtitle') }}</p>
      </div>
      <Badge v-if="!isLoading" :variant="ssoEnabled ? 'success' : 'secondary'">
        {{ ssoEnabled ? t('admin.sso.enabled') : t('admin.sso.disabled') }}
      </Badge>
    </div>

    <!-- Loading State -->
    <Card v-if="isLoading">
      <CardContent class="flex items-center justify-center py-12">
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
        <span class="ml-2 text-muted-foreground">{{ t('admin.sso.loading') }}</span>
      </CardContent>
    </Card>

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">{{ t('admin.sso.error.loadFailed') }}</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="loadSSOConfig">
          {{ t('admin.sso.error.retry') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Main Content -->
    <template v-else>
      <!-- Login URL (when SSO is enabled) -->
      <Card v-if="ssoEnabled && loginUrl">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Shield class="h-5 w-5" />
            {{ t('admin.sso.loginUrl.title') }}
          </CardTitle>
          <CardDescription>{{ t('admin.sso.loginUrl.description') }}</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex items-center gap-2">
            <code class="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
              {{ loginUrl }}
            </code>
            <Button variant="outline" size="icon" @click="copyLoginUrl">
              <Copy class="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Configuration Form -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Key class="h-5 w-5" />
            {{ ssoEnabled ? t('admin.sso.actions.update') : 'SSO Configuration' }}
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- Provider Selection -->
          <div class="space-y-2">
            <Label for="provider">{{ t('admin.sso.provider.label') }}</Label>
            <Select v-model="provider">
              <option value="" disabled>{{ t('admin.sso.provider.placeholder') }}</option>
              <option value="google">{{ t('admin.sso.provider.google') }}</option>
              <option value="microsoft">{{ t('admin.sso.provider.microsoft') }}</option>
              <option value="oidc">{{ t('admin.sso.provider.oidc') }}</option>
            </Select>
          </div>

          <template v-if="provider">
            <!-- Client ID -->
            <div class="space-y-2">
              <Label for="clientId">{{ t('admin.sso.fields.clientId') }}</Label>
              <Input
                id="clientId"
                v-model="clientId"
                :placeholder="t('admin.sso.fields.clientIdPlaceholder')"
              />
              <p class="text-xs text-muted-foreground">{{ t('admin.sso.fields.clientIdHint') }}</p>
            </div>

            <!-- Client Secret -->
            <div class="space-y-2">
              <Label for="clientSecret">{{ t('admin.sso.fields.clientSecret') }}</Label>
              <Input
                id="clientSecret"
                v-model="clientSecret"
                type="password"
                :placeholder="ssoEnabled ? '••••••••••••' : t('admin.sso.fields.clientSecretPlaceholder')"
              />
              <p class="text-xs text-muted-foreground">{{ t('admin.sso.fields.clientSecretHint') }}</p>
            </div>

            <!-- Microsoft Tenant ID -->
            <div v-if="provider === 'microsoft'" class="space-y-2">
              <Label for="tenantId">{{ t('admin.sso.fields.tenantId') }}</Label>
              <Input
                id="tenantId"
                v-model="tenantId"
                :placeholder="t('admin.sso.fields.tenantIdPlaceholder')"
              />
              <p class="text-xs text-muted-foreground">{{ t('admin.sso.fields.tenantIdHint') }}</p>
            </div>

            <!-- OIDC Issuer -->
            <div v-if="provider === 'oidc'" class="space-y-2">
              <Label for="issuer">{{ t('admin.sso.fields.issuer') }}</Label>
              <Input
                id="issuer"
                v-model="issuer"
                :placeholder="t('admin.sso.fields.issuerPlaceholder')"
              />
              <p class="text-xs text-muted-foreground">{{ t('admin.sso.fields.issuerHint') }}</p>
            </div>

            <Separator />

            <!-- Test Results -->
            <div v-if="testResults" class="space-y-3">
              <h4 class="font-medium flex items-center gap-2">
                <component
                  :is="testResults.overall ? CheckCircle2 : XCircle"
                  :class="testResults.overall ? 'text-green-500' : 'text-red-500'"
                  class="h-5 w-5"
                />
                {{ t('admin.sso.test.title') }}
              </h4>

              <Alert :variant="testResults.discovery.success ? 'default' : 'destructive'">
                <component :is="testResults.discovery.success ? CheckCircle2 : AlertCircle" class="h-4 w-4" />
                <AlertTitle>
                  {{ testResults.discovery.success ? t('admin.sso.test.discoverySuccess') : t('admin.sso.test.discoveryFailed') }}
                </AlertTitle>
                <AlertDescription v-if="testResults.discovery.error">
                  {{ testResults.discovery.error }}
                </AlertDescription>
                <AlertDescription v-else-if="testResults.discovery.endpoints">
                  <div class="mt-2 space-y-1 text-xs">
                    <p class="font-medium">{{ t('admin.sso.test.endpoints') }}:</p>
                    <ul class="list-disc list-inside pl-2 space-y-1">
                      <li v-for="(url, name) in testResults.discovery.endpoints" :key="name">
                        <span class="font-mono">{{ name }}</span>: {{ url }}
                      </li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </div>

            <!-- Actions -->
            <div class="flex flex-wrap gap-3">
              <Button
                variant="outline"
                @click="testConfiguration"
                :disabled="!isFormValid || isTesting"
              >
                <Loader2 v-if="isTesting" class="mr-2 h-4 w-4 animate-spin" />
                {{ t('admin.sso.actions.test') }}
              </Button>

              <Button
                @click="saveConfiguration"
                :disabled="!isFormValid || isSaving"
              >
                <Loader2 v-if="isSaving" class="mr-2 h-4 w-4 animate-spin" />
                {{ ssoEnabled ? t('admin.sso.actions.update') : t('admin.sso.actions.save') }}
              </Button>

              <Button
                v-if="ssoEnabled"
                variant="destructive"
                @click="showDisableDialog = true"
              >
                {{ t('admin.sso.actions.disable') }}
              </Button>
            </div>
          </template>
        </CardContent>
      </Card>

      <!-- Help Section -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <HelpCircle class="h-5 w-5" />
            {{ t('admin.sso.help.title') }}
          </CardTitle>
          <CardDescription>{{ t('admin.sso.help.description') }}</CardDescription>
        </CardHeader>
        <CardContent>
          <ol class="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>{{ t('admin.sso.help.step1') }}</li>
            <li>{{ t('admin.sso.help.step2', { redirectUri }) }}</li>
            <li>{{ t('admin.sso.help.step3') }}</li>
            <li>{{ t('admin.sso.help.step4') }}</li>
          </ol>
          <div class="mt-4">
            <Button variant="link" class="h-auto p-0" as-child>
              <a href="/docs/guides/b2b-sso-setup" target="_blank" class="flex items-center gap-1">
                {{ t('admin.sso.help.docsLink') }}
                <ExternalLink class="h-3 w-3" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </template>

    <!-- Disable Confirmation Dialog -->
    <Dialog v-model:open="showDisableDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('admin.sso.confirmDisable.title') }}</DialogTitle>
          <DialogDescription>
            {{ t('admin.sso.confirmDisable.description') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDisableDialog = false">
            {{ t('admin.sso.confirmDisable.cancel') }}
          </Button>
          <Button variant="destructive" @click="disableSSO" :disabled="isDeleting">
            <Loader2 v-if="isDeleting" class="mr-2 h-4 w-4 animate-spin" />
            {{ t('admin.sso.confirmDisable.confirm') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

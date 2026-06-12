<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { apiClient } from '@/composables/useApi';
import type { AvatarStyle } from '@/composables/useAvatar';
import { UserAvatar } from '@/components/user';
import AvatarSelector from '@/components/user/AvatarSelector.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Lock, Shield, Loader2, ShoppingBag, ChevronRight, Trash2, AlertTriangle } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

// Profile form state - use computed to stay reactive with authStore
const firstName = computed(() => authStore.user?.firstName || '');
const lastName = computed(() => authStore.user?.lastName || '');
const selectedAvatarStyle = ref<AvatarStyle>((authStore.user?.avatarStyle as AvatarStyle) || 'initials');
const selectedAvatarVariation = ref<number>(authStore.user?.avatarVariation ?? 0);

// Password form state
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const isChangingPassword = ref(false);
const passwordError = ref<string | null>(null);

const roleLabel = computed(() => {
  const role = authStore.user?.role;
  if (!role) return '';
  return t(`common.profile.roles.${role}`);
});

const passwordsMatch = computed(() => {
  return newPassword.value === confirmPassword.value;
});

const canSubmitPassword = computed(() => {
  return (
    currentPassword.value &&
    newPassword.value &&
    confirmPassword.value &&
    passwordsMatch.value &&
    newPassword.value.length >= 8
  );
});

async function changePassword() {
  if (!canSubmitPassword.value) return;

  isChangingPassword.value = true;
  passwordError.value = null;

  const success = await authStore.changePassword(
    currentPassword.value,
    newPassword.value,
  );

  if (success) {
    toast.success(t('common.profile.passwordChanged'));
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } else {
    passwordError.value = authStore.error;
  }

  isChangingPassword.value = false;
}

// Account deletion (GDPR right to erasure) state
const deleteDialogOpen = ref(false);
const deletePassword = ref('');
const deleteConfirmEmail = ref('');
const isDeletingAccount = ref(false);
const deleteError = ref<string | null>(null);

const isSSO = computed(() => authStore.user?.isSSO === true);

// Confirm by typing the exact account email (locale-neutral, unambiguous).
const emailConfirmed = computed(
  () => deleteConfirmEmail.value.trim().toLowerCase() === (authStore.user?.email || '').toLowerCase(),
);

const canDeleteAccount = computed(
  () => emailConfirmed.value && (isSSO.value || deletePassword.value.length > 0),
);

function resetDeleteForm() {
  deletePassword.value = '';
  deleteConfirmEmail.value = '';
  deleteError.value = null;
}

async function confirmDeleteAccount() {
  if (!canDeleteAccount.value) return;

  isDeletingAccount.value = true;
  deleteError.value = null;

  const success = await authStore.deleteAccount(isSSO.value ? undefined : deletePassword.value);

  if (success) {
    deleteDialogOpen.value = false;
    toast.success(t('common.profile.deleteAccount.success'));
    router.push('/login');
  } else {
    deleteError.value = authStore.error;
  }

  isDeletingAccount.value = false;
}

async function onAvatarSelect(style: AvatarStyle, variation: number) {
  selectedAvatarStyle.value = style;
  selectedAvatarVariation.value = variation;

  try {
    await apiClient.patch('/auth/me/avatar', {
      avatarStyle: style,
      avatarVariation: variation,
    });
    // Update local auth store
    if (authStore.user) {
      authStore.user.avatarStyle = style;
      authStore.user.avatarVariation = variation;
    }
  } catch {
    toast.error(t('common.errors.generic'));
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">{{ t('common.profile.title') }}</h1>
      <p class="text-muted-foreground">{{ t('common.profile.subtitle') }}</p>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Profile Card -->
      <Card class="lg:col-span-2">
        <CardHeader>
          <div class="flex items-center gap-2">
            <User class="h-5 w-5 text-muted-foreground" />
            <CardTitle>{{ t('common.profile.personalInfo') }}</CardTitle>
          </div>
          <CardDescription>{{ t('common.profile.personalInfoDesc') }}</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-6">
            <!-- Avatar Preview & Selector -->
            <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div class="flex flex-col items-center gap-2">
                <UserAvatar
                  :user-id="authStore.user?.id || ''"
                  :first-name="firstName"
                  :last-name="lastName"
                  :style="selectedAvatarStyle"
                  :variation="selectedAvatarVariation"
                  size="xl"
                />
                <p class="text-sm text-muted-foreground">{{ t('common.profile.preview') }}</p>
              </div>
              <div class="flex-1">
                <AvatarSelector
                  :user-id="authStore.user?.id || ''"
                  :first-name="firstName"
                  :last-name="lastName"
                  :current-style="selectedAvatarStyle"
                  :current-variation="selectedAvatarVariation"
                  @select="onAvatarSelect"
                />
              </div>
            </div>

            <Separator />

            <!-- Name Fields (read-only for now, API endpoint not implemented) -->
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <Label for="firstName">{{ t('common.profile.firstName') }}</Label>
                <Input
                  id="firstName"
                  :model-value="firstName"
                  disabled
                  class="bg-muted"
                />
              </div>
              <div class="space-y-2">
                <Label for="lastName">{{ t('common.profile.lastName') }}</Label>
                <Input
                  id="lastName"
                  :model-value="lastName"
                  disabled
                  class="bg-muted"
                />
              </div>
            </div>

            <!-- Email (read-only) -->
            <div class="space-y-2">
              <Label for="email">{{ t('common.profile.email') }}</Label>
              <Input
                id="email"
                :model-value="authStore.user?.email"
                disabled
                class="bg-muted"
              />
              <p class="text-xs text-muted-foreground">{{ t('common.profile.emailNote') }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Account Info Card -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <Shield class="h-5 w-5 text-muted-foreground" />
            <CardTitle>{{ t('common.profile.accountInfo') }}</CardTitle>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <div>
            <p class="text-sm font-medium text-muted-foreground">{{ t('common.profile.role') }}</p>
            <p class="text-sm">{{ roleLabel }}</p>
          </div>
          <div v-if="authStore.user?.tenantId">
            <p class="text-sm font-medium text-muted-foreground">{{ t('common.profile.organization') }}</p>
            <p class="text-sm">{{ t('common.profile.enterpriseAccount') }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-muted-foreground">{{ t('common.profile.accountId') }}</p>
            <p class="font-mono text-xs text-muted-foreground">{{ authStore.user?.id }}</p>
          </div>

          <Separator />

          <!-- Purchase History Link -->
          <RouterLink
            to="/purchases"
            class="flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-muted transition-colors"
          >
            <div class="flex items-center gap-3">
              <ShoppingBag class="h-5 w-5 text-muted-foreground" />
              <div>
                <p class="text-sm font-medium">{{ t('common.profile.purchaseHistory') }}</p>
                <p class="text-xs text-muted-foreground">{{ t('common.profile.purchaseHistoryDesc') }}</p>
              </div>
            </div>
            <ChevronRight class="h-4 w-4 text-muted-foreground" />
          </RouterLink>
        </CardContent>
      </Card>
    </div>

    <!-- Password Change Card -->
    <Card>
      <CardHeader>
        <div class="flex items-center gap-2">
          <Lock class="h-5 w-5 text-muted-foreground" />
          <CardTitle>{{ t('common.profile.changePassword') }}</CardTitle>
        </div>
        <CardDescription>{{ t('common.profile.changePasswordDesc') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="changePassword" class="max-w-md space-y-4">
          <Alert v-if="passwordError" variant="destructive">
            <AlertDescription>{{ passwordError }}</AlertDescription>
          </Alert>

          <div class="space-y-2">
            <Label for="currentPassword">{{ t('common.profile.currentPassword') }}</Label>
            <Input
              id="currentPassword"
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
            />
          </div>

          <div class="space-y-2">
            <Label for="newPassword">{{ t('common.profile.newPassword') }}</Label>
            <Input
              id="newPassword"
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
            />
            <p class="text-xs text-muted-foreground">{{ t('common.profile.passwordRequirements') }}</p>
          </div>

          <div class="space-y-2">
            <Label for="confirmPassword">{{ t('common.profile.confirmPassword') }}</Label>
            <Input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              :class="{ 'border-destructive': confirmPassword && !passwordsMatch }"
            />
            <p v-if="confirmPassword && !passwordsMatch" class="text-xs text-destructive">
              {{ t('common.validation.passwordMatch') }}
            </p>
          </div>

          <Button type="submit" :disabled="!canSubmitPassword || isChangingPassword">
            <Loader2 v-if="isChangingPassword" class="mr-2 h-4 w-4 animate-spin" />
            {{ t('common.profile.updatePassword') }}
          </Button>
        </form>
      </CardContent>
    </Card>

    <!-- Danger Zone: Account Deletion (GDPR right to erasure) -->
    <Card class="border-destructive/50">
      <CardHeader>
        <div class="flex items-center gap-2">
          <AlertTriangle class="h-5 w-5 text-destructive" />
          <CardTitle class="text-destructive">{{ t('common.profile.dangerZone') }}</CardTitle>
        </div>
        <CardDescription>{{ t('common.profile.deleteAccount.description') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog v-model:open="deleteDialogOpen" @update:open="(open: boolean) => { if (!open) resetDeleteForm(); }">
          <AlertDialogTrigger as-child>
            <Button variant="destructive">
              <Trash2 class="mr-2 h-4 w-4" />
              {{ t('common.profile.deleteAccount.button') }}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{{ t('common.profile.deleteAccount.confirmTitle') }}</AlertDialogTitle>
              <AlertDialogDescription>
                {{ t('common.profile.deleteAccount.confirmWarning') }}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div class="space-y-4 py-2">
              <Alert v-if="deleteError" variant="destructive">
                <AlertDescription>{{ deleteError }}</AlertDescription>
              </Alert>

              <div class="space-y-2">
                <Label for="deleteConfirmEmail">
                  {{ t('common.profile.deleteAccount.emailConfirmLabel', { email: authStore.user?.email }) }}
                </Label>
                <Input
                  id="deleteConfirmEmail"
                  v-model="deleteConfirmEmail"
                  type="email"
                  autocomplete="off"
                  :placeholder="authStore.user?.email"
                />
              </div>

              <div v-if="!isSSO" class="space-y-2">
                <Label for="deletePassword">{{ t('common.profile.deleteAccount.passwordLabel') }}</Label>
                <Input
                  id="deletePassword"
                  v-model="deletePassword"
                  type="password"
                  autocomplete="current-password"
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel :disabled="isDeletingAccount">
                {{ t('common.cancel') }}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                :disabled="!canDeleteAccount || isDeletingAccount"
                @click="confirmDeleteAccount"
              >
                <Loader2 v-if="isDeletingAccount" class="mr-2 h-4 w-4 animate-spin" />
                {{ t('common.profile.deleteAccount.confirmButton') }}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  </div>
</template>

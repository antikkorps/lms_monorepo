<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useLicenses, type License } from '@/composables/useLicenses';
import { useApi } from '@/composables/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/user';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  ArrowLeft,
  KeyRound,
  RefreshCcw,
  AlertTriangle,
  UserPlus,
  UserMinus,
  Calendar,
  CreditCard,
} from 'lucide-vue-next';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const api = useApi();
const { fetchLicense, assignSeat, unassignSeat, renewLicense, requestRefund, formatAmount, getStatusColor, loading } = useLicenses();

const license = ref<License | null>(null);
const teamMembers = ref<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
const selectedUserId = ref('');
const refundReason = ref('');
const actionLoading = ref(false);
const actionError = ref<string | null>(null);

const licenseId = computed(() => route.params.id as string);

const availableMembers = computed(() => {
  if (!license.value?.assignments) return teamMembers.value;
  const assignedIds = new Set(license.value.assignments.map((a) => a.userId));
  return teamMembers.value.filter((m) => !assignedIds.has(m.id));
});

async function loadLicense() {
  try {
    license.value = await fetchLicense(licenseId.value);
  } catch {
    // handled by composable
  }
}

async function loadTeamMembers() {
  try {
    const result = await api.get<{ members: Array<{ id: string; firstName: string; lastName: string; email: string }> }>('/tenant/members', { limit: 200 });
    teamMembers.value = result.members;
  } catch {
    // non-critical
  }
}

async function handleAssign() {
  if (!selectedUserId.value) return;
  actionLoading.value = true;
  actionError.value = null;
  try {
    await assignSeat(licenseId.value, selectedUserId.value);
    selectedUserId.value = '';
    await loadLicense();
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : t('licenses.errors.assignFailed');
  } finally {
    actionLoading.value = false;
  }
}

async function handleUnassign(userId: string) {
  actionLoading.value = true;
  actionError.value = null;
  try {
    await unassignSeat(licenseId.value, userId);
    await loadLicense();
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : t('licenses.errors.unassignFailed');
  } finally {
    actionLoading.value = false;
  }
}

async function handleRenew() {
  actionLoading.value = true;
  actionError.value = null;
  try {
    const result = await renewLicense(licenseId.value);
    if (result.url) {
      window.location.href = result.url;
    }
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : t('licenses.errors.renewFailed');
  } finally {
    actionLoading.value = false;
  }
}

async function handleRefund() {
  actionLoading.value = true;
  actionError.value = null;
  try {
    await requestRefund(licenseId.value, refundReason.value || undefined);
    await loadLicense();
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : t('licenses.errors.refundFailed');
  } finally {
    actionLoading.value = false;
  }
}

onMounted(() => {
  loadLicense();
  loadTeamMembers();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Back button -->
    <Button variant="ghost" size="sm" @click="router.push('/admin/licenses')">
      <ArrowLeft class="mr-2 h-4 w-4" />
      {{ t('licenses.title') }}
    </Button>

    <div v-if="loading && !license" class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>

    <template v-else-if="license">
      <!-- Expiration Warning -->
      <div
        v-if="license.isExpiringSoon || license.isExpired"
        :class="[
          'flex items-center gap-3 rounded-lg border p-4',
          license.isExpired ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
        ]"
      >
        <AlertTriangle :class="license.isExpired ? 'h-5 w-5 text-red-500' : 'h-5 w-5 text-amber-500'" />
        <span :class="license.isExpired ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'">
          {{ license.isExpired ? t('licenses.expiration.expired') : t('licenses.expiration.expiringSoon') }}
          <template v-if="license.expiresAt">
            - {{ new Date(license.expiresAt).toLocaleDateString() }}
          </template>
        </span>
        <Button v-if="license.isExpired || license.isExpiringSoon" size="sm" class="ml-auto" @click="handleRenew" :disabled="actionLoading">
          <RefreshCcw class="mr-2 h-4 w-4" />
          {{ t('licenses.detail.renewLicense') }}
        </Button>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- License Info -->
        <Card class="lg:col-span-2">
          <CardHeader>
            <CardTitle>{{ t('licenses.detail.licenseInfo') }}</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <!-- Course -->
            <div class="flex items-center gap-4">
              <img
                v-if="license.course?.thumbnailUrl"
                :src="license.course.thumbnailUrl"
                :alt="license.course.title"
                class="h-16 w-24 rounded object-cover"
              />
              <div v-else class="flex h-16 w-24 items-center justify-center rounded bg-muted">
                <KeyRound class="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 class="text-lg font-semibold">{{ license.course?.title }}</h3>
                <Badge variant="outline" class="mt-1">{{ t(`licenses.type.${license.licenseType}`) }}</Badge>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <Label class="text-muted-foreground">{{ t('licenses.detail.purchasedBy') }}</Label>
                <p class="font-medium">{{ license.purchasedBy?.firstName }} {{ license.purchasedBy?.lastName }}</p>
              </div>
              <div>
                <Label class="text-muted-foreground">{{ t('licenses.detail.purchasedAt') }}</Label>
                <p class="font-medium">{{ license.purchasedAt ? new Date(license.purchasedAt).toLocaleDateString() : '-' }}</p>
              </div>
              <div>
                <Label class="text-muted-foreground">{{ t('licenses.detail.amount') }}</Label>
                <p class="font-medium">{{ formatAmount(license.amount, license.currency) }}</p>
              </div>
              <div>
                <Label class="text-muted-foreground">{{ t('licenses.table.status') }}</Label>
                <p>
                  <span :class="['inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', getStatusColor(license.status)]">
                    {{ t(`licenses.status.${license.status === 'completed' ? 'active' : license.status}`) }}
                  </span>
                </p>
              </div>
              <div v-if="license.expiresAt">
                <Label class="text-muted-foreground">{{ t('licenses.detail.expiresAt') }}</Label>
                <p class="flex items-center gap-2 font-medium">
                  <Calendar class="h-4 w-4" />
                  {{ new Date(license.expiresAt).toLocaleDateString() }}
                </p>
              </div>
              <div v-if="license.renewedAt">
                <Label class="text-muted-foreground">{{ t('licenses.detail.renewedAt') }}</Label>
                <p class="font-medium">{{ new Date(license.renewedAt).toLocaleDateString() }} (x{{ license.renewalCount }})</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Actions -->
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <Button
              v-if="license.status === 'completed' || license.status === 'expired'"
              class="w-full"
              @click="handleRenew"
              :disabled="actionLoading"
            >
              <RefreshCcw class="mr-2 h-4 w-4" />
              {{ t('licenses.detail.renewLicense') }}
            </Button>

            <AlertDialog v-if="license.status === 'completed'">
              <AlertDialogTrigger as-child>
                <Button variant="destructive" class="w-full">
                  <CreditCard class="mr-2 h-4 w-4" />
                  {{ t('licenses.detail.requestRefund') }}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{{ t('licenses.detail.requestRefund') }}</AlertDialogTitle>
                  <AlertDialogDescription>{{ t('licenses.detail.refundConfirm') }}</AlertDialogDescription>
                </AlertDialogHeader>
                <div class="py-4">
                  <Label>{{ t('licenses.detail.refundReason') }}</Label>
                  <Input v-model="refundReason" class="mt-2" />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction @click="handleRefund" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {{ t('licenses.detail.requestRefund') }}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div v-if="actionError" class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {{ actionError }}
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Seat Management -->
      <Card v-if="license.licenseType === 'seats'">
        <CardHeader>
          <CardTitle>{{ t('licenses.detail.seatManagement') }}</CardTitle>
          <CardDescription>
            {{ t('licenses.detail.seatsUsed', { used: license.seatsUsed, total: license.seatsTotal }) }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <!-- Assign form -->
          <div v-if="license.status === 'completed' && !license.isExpired && (license.availableSeats === null || license.availableSeats > 0)" class="mb-6 flex gap-3">
            <Select v-model="selectedUserId" :placeholder="t('licenses.detail.selectUser')" class="flex-1">
              <option value="" disabled>{{ t('licenses.detail.selectUser') }}</option>
              <option v-for="member in availableMembers" :key="member.id" :value="member.id">
                {{ member.firstName }} {{ member.lastName }} ({{ member.email }})
              </option>
            </Select>
            <Button @click="handleAssign" :disabled="!selectedUserId || actionLoading">
              <UserPlus class="mr-2 h-4 w-4" />
              {{ t('licenses.detail.assign') }}
            </Button>
          </div>

          <!-- Assignments table -->
          <div v-if="license.assignments && license.assignments.length > 0" class="space-y-3">
            <div
              v-for="assignment in license.assignments"
              :key="assignment.id"
              class="flex items-center justify-between rounded-lg border p-3"
            >
              <div class="flex items-center gap-3">
                <UserAvatar
                  :user-id="assignment.user.id"
                  :first-name="assignment.user.firstName"
                  :last-name="assignment.user.lastName"
                  :avatar-url="assignment.user.avatarUrl"
                  size="sm"
                />
                <div>
                  <p class="font-medium">{{ assignment.user.firstName }} {{ assignment.user.lastName }}</p>
                  <p class="text-sm text-muted-foreground">{{ assignment.user.email }}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                class="text-destructive hover:text-destructive"
                @click="handleUnassign(assignment.userId)"
                :disabled="actionLoading"
              >
                <UserMinus class="mr-1 h-4 w-4" />
                {{ t('licenses.detail.unassign') }}
              </Button>
            </div>
          </div>
          <p v-else class="py-6 text-center text-muted-foreground">{{ t('licenses.detail.noAssignments') }}</p>
        </CardContent>
      </Card>

      <!-- Unlimited notice -->
      <Card v-else-if="license.licenseType === 'unlimited'">
        <CardContent class="flex items-center gap-3 p-6">
          <KeyRound class="h-5 w-5 text-primary" />
          <p class="text-muted-foreground">{{ t('licenses.detail.unlimitedAccess') }}</p>
        </CardContent>
      </Card>
    </template>
  </div>
</template>

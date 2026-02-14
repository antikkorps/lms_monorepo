<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useLicenses, type License } from '@/composables/useLicenses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Plus, AlertTriangle, Users, Eye } from 'lucide-vue-next';

const { t } = useI18n();
const router = useRouter();
const { fetchLicenses, formatAmount, getStatusColor, loading } = useLicenses();

const licenses = ref<License[]>([]);
const statusFilter = ref('all');
const currentPage = ref(1);
const totalPages = ref(1);
const total = ref(0);

const stats = computed(() => {
  const active = licenses.value.filter((l) => l.status === 'completed' && !l.isExpired).length;
  const expiring = licenses.value.filter((l) => l.isExpiringSoon).length;
  const totalSeats = licenses.value.reduce((sum, l) => sum + l.seatsUsed, 0);
  return { active, expiring, totalSeats };
});

async function loadLicenses() {
  try {
    const params: Record<string, string | number> = { page: currentPage.value, limit: 20 };
    if (statusFilter.value !== 'all') params.status = statusFilter.value;
    const result = await fetchLicenses(params);
    licenses.value = result.licenses;
    totalPages.value = result.pagination.totalPages;
    total.value = result.pagination.total;
  } catch {
    // error handled by composable
  }
}

function getExpirationText(license: License): string {
  if (!license.expiresAt) return t('licenses.expiration.noExpiration');
  if (license.isExpired) return t('licenses.expiration.expired');
  const days = Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (license.isExpiringSoon) return t('licenses.expiration.daysLeft', { days });
  return new Date(license.expiresAt).toLocaleDateString();
}

watch(statusFilter, () => {
  currentPage.value = 1;
  loadLicenses();
});

onMounted(loadLicenses);
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ t('licenses.title') }}</h1>
        <p class="text-muted-foreground">{{ t('licenses.subtitle') }}</p>
      </div>
      <Button @click="router.push('/admin/licenses/checkout')">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('licenses.purchase') }}
      </Button>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">{{ t('licenses.stats.activeLicenses') }}</CardTitle>
          <KeyRound class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ stats.active }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">{{ t('licenses.stats.expiringSoon') }}</CardTitle>
          <AlertTriangle class="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold" :class="stats.expiring > 0 ? 'text-amber-500' : ''">{{ stats.expiring }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">{{ t('licenses.stats.totalSeats') }}</CardTitle>
          <Users class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ stats.totalSeats }}</div>
        </CardContent>
      </Card>
    </div>

    <!-- Status filter -->
    <div class="flex gap-2">
      <Button
        v-for="s in ['all', 'active', 'pending', 'expired', 'refunded']"
        :key="s"
        :variant="statusFilter === s ? 'default' : 'outline'"
        size="sm"
        @click="statusFilter = s"
      >
        {{ t(`licenses.status.${s}`) }}
      </Button>
    </div>

    <!-- Licenses Table -->
    <Card>
      <CardContent class="p-0">
        <div v-if="loading" class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>

        <div v-else-if="licenses.length === 0" class="py-12 text-center">
          <KeyRound class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 class="text-lg font-medium">{{ t('licenses.noLicenses') }}</h3>
          <p class="mt-1 text-sm text-muted-foreground">{{ t('licenses.noLicensesDescription') }}</p>
          <Button class="mt-4" @click="router.push('/admin/licenses/checkout')">
            <Plus class="mr-2 h-4 w-4" />
            {{ t('licenses.purchase') }}
          </Button>
        </div>

        <table v-else class="w-full">
          <thead>
            <tr class="border-b text-left text-sm text-muted-foreground">
              <th class="px-4 py-3 font-medium">{{ t('licenses.table.course') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('licenses.table.type') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('licenses.table.seats') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('licenses.table.status') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('licenses.table.expiration') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('licenses.table.amount') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('licenses.table.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="license in licenses"
              :key="license.id"
              class="border-b last:border-b-0 hover:bg-muted/50"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <img
                    v-if="license.course?.thumbnailUrl"
                    :src="license.course.thumbnailUrl"
                    :alt="license.course.title"
                    class="h-10 w-14 rounded object-cover"
                  />
                  <div v-else class="flex h-10 w-14 items-center justify-center rounded bg-muted">
                    <KeyRound class="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span class="font-medium">{{ license.course?.title || 'Unknown' }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <Badge variant="outline">{{ t(`licenses.type.${license.licenseType}`) }}</Badge>
              </td>
              <td class="px-4 py-3">
                <span v-if="license.licenseType === 'unlimited'" class="text-muted-foreground">-</span>
                <span v-else>{{ license.seatsUsed }} / {{ license.seatsTotal }}</span>
              </td>
              <td class="px-4 py-3">
                <span :class="['inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', getStatusColor(license.status)]">
                  {{ t(`licenses.status.${license.status === 'completed' ? 'active' : license.status}`) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm">
                <span :class="{ 'text-amber-500': license.isExpiringSoon, 'text-red-500': license.isExpired }">
                  {{ getExpirationText(license) }}
                </span>
              </td>
              <td class="px-4 py-3 font-medium">
                {{ formatAmount(license.amount, license.currency) }}
              </td>
              <td class="px-4 py-3">
                <Button variant="ghost" size="sm" @click="router.push(`/admin/licenses/${license.id}`)">
                  <Eye class="mr-1 h-4 w-4" />
                  {{ t('licenses.table.actions') }}
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
      <Button variant="outline" size="sm" :disabled="currentPage <= 1" @click="currentPage--; loadLicenses()">
        Previous
      </Button>
      <span class="text-sm text-muted-foreground">{{ currentPage }} / {{ totalPages }}</span>
      <Button variant="outline" size="sm" :disabled="currentPage >= totalPages" @click="currentPage++; loadLicenses()">
        Next
      </Button>
    </div>
  </div>
</template>

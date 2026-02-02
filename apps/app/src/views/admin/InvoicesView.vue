<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTenantInvoices, type InvoicesFilter } from '@/composables/useTenantInvoices';
import {
  FileText,
  Download,
  AlertCircle,
  Receipt,
  CreditCard,
  Clock,
  RefreshCw,
  ExternalLink,
} from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { InvoiceStatus } from '@shared/types';

const { t } = useI18n();

const {
  isLoading,
  error,
  invoices,
  hasInvoices,
  paidInvoices,
  openInvoices,
  totalPaid,
  fetchInvoices,
  downloadInvoicePdf,
  formatAmount,
  formatDate,
  getStatusColor,
} = useTenantInvoices();

const statusFilter = ref<InvoiceStatus | 'all'>('all');
const isDownloading = ref<string | null>(null);

const filter = computed<InvoicesFilter | undefined>(() => {
  if (statusFilter.value === 'all') return undefined;
  return { status: statusFilter.value };
});

async function handleStatusChange(value: string) {
  statusFilter.value = value as InvoiceStatus | 'all';
  await fetchInvoices(filter.value);
}

async function handleDownload(invoiceId: string) {
  isDownloading.value = invoiceId;
  try {
    await downloadInvoicePdf(invoiceId);
  } finally {
    isDownloading.value = null;
  }
}

async function handleRefresh() {
  await fetchInvoices(filter.value);
}

function getStatusLabel(status: InvoiceStatus): string {
  return t(`admin.invoices.status.${status}`);
}

onMounted(() => {
  fetchInvoices();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">{{ t('admin.invoices.title') }}</h1>
        <p class="text-muted-foreground">{{ t('admin.invoices.subtitle') }}</p>
      </div>
      <Button variant="outline" @click="handleRefresh" :disabled="isLoading">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': isLoading }" />
        {{ t('admin.invoices.refresh') }}
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !hasInvoices" class="space-y-4">
      <div class="grid gap-4 md:grid-cols-3">
        <Card v-for="i in 3" :key="i">
          <CardHeader class="pb-2">
            <div class="h-4 w-24 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div class="h-8 w-32 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent class="py-8">
          <div class="space-y-4">
            <div v-for="i in 5" :key="i" class="h-12 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">{{ t('admin.invoices.error.loadFailed') }}</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="handleRefresh">
          {{ t('admin.invoices.error.retry') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Content -->
    <template v-else>
      <!-- Summary Cards -->
      <div class="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('admin.invoices.stats.total') }}</CardTitle>
            <Receipt class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ invoices.length }}</div>
            <p class="text-xs text-muted-foreground">
              {{ t('admin.invoices.stats.allTime') }}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('admin.invoices.stats.paid') }}</CardTitle>
            <CreditCard class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ paidInvoices.length }}</div>
            <p class="text-xs text-muted-foreground">
              {{ t('admin.invoices.stats.totalAmount', { amount: invoices.length > 0 ? formatAmount(totalPaid, paidInvoices[0]?.currency || 'EUR') : '€0.00' }) }}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">{{ t('admin.invoices.stats.open') }}</CardTitle>
            <Clock class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ openInvoices.length }}</div>
            <p class="text-xs text-muted-foreground">
              {{ t('admin.invoices.stats.awaitingPayment') }}
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-4">
        <Select
          :model-value="statusFilter"
          class="w-[180px]"
          @update:model-value="handleStatusChange"
        >
          <option value="all">{{ t('admin.invoices.filters.allStatus') }}</option>
          <option value="paid">{{ t('admin.invoices.filters.paid') }}</option>
          <option value="open">{{ t('admin.invoices.filters.open') }}</option>
          <option value="draft">{{ t('admin.invoices.filters.draft') }}</option>
          <option value="void">{{ t('admin.invoices.filters.void') }}</option>
        </Select>
      </div>

      <!-- Invoices Table -->
      <Card>
        <CardHeader>
          <CardTitle>{{ t('admin.invoices.table.title') }}</CardTitle>
          <CardDescription>
            {{ t('admin.invoices.table.description') }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <!-- Empty State -->
          <div v-if="!hasInvoices" class="flex flex-col items-center justify-center py-12 text-center">
            <FileText class="h-12 w-12 text-muted-foreground mb-4" />
            <h3 class="text-lg font-medium">{{ t('admin.invoices.empty.title') }}</h3>
            <p class="text-sm text-muted-foreground max-w-sm mt-1">
              {{ t('admin.invoices.empty.message') }}
            </p>
          </div>

          <!-- Table -->
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('admin.invoices.table.invoice') }}</TableHead>
                <TableHead>{{ t('admin.invoices.table.date') }}</TableHead>
                <TableHead>{{ t('admin.invoices.table.status') }}</TableHead>
                <TableHead>{{ t('admin.invoices.table.dueDate') }}</TableHead>
                <TableHead class="text-right">{{ t('admin.invoices.table.amount') }}</TableHead>
                <TableHead class="text-right">{{ t('admin.invoices.table.actions') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="invoice in invoices" :key="invoice.id">
                <TableCell>
                  <div class="flex items-center gap-2">
                    <FileText class="h-4 w-4 text-muted-foreground" />
                    <span class="font-medium">{{ invoice.number || invoice.id.slice(0, 8) }}</span>
                  </div>
                  <p v-if="invoice.description" class="text-xs text-muted-foreground mt-1">
                    {{ invoice.description }}
                  </p>
                </TableCell>
                <TableCell>{{ formatDate(invoice.createdAt) }}</TableCell>
                <TableCell>
                  <Badge :class="getStatusColor(invoice.status)">
                    {{ getStatusLabel(invoice.status) }}
                  </Badge>
                </TableCell>
                <TableCell>
                  {{ invoice.dueDate ? formatDate(invoice.dueDate) : '-' }}
                </TableCell>
                <TableCell class="text-right font-medium">
                  {{ formatAmount(invoice.total, invoice.currency) }}
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex items-center justify-end gap-2">
                    <Button
                      v-if="invoice.hostedUrl"
                      variant="ghost"
                      size="sm"
                      as="a"
                      :href="invoice.hostedUrl"
                      target="_blank"
                      :title="t('admin.invoices.actions.view')"
                    >
                      <ExternalLink class="h-4 w-4" />
                      <span class="sr-only">{{ t('admin.invoices.actions.view') }}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      :title="t('admin.invoices.actions.download')"
                      @click="handleDownload(invoice.id)"
                      :disabled="isDownloading === invoice.id"
                    >
                      <Download
                        class="h-4 w-4"
                        :class="{ 'animate-pulse': isDownloading === invoice.id }"
                      />
                      <span class="sr-only">{{ t('admin.invoices.actions.download') }}</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </template>
  </div>
</template>

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { InvoiceStatus } from '@shared/types';

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
  const labels: Record<InvoiceStatus, string> = {
    paid: 'Paid',
    open: 'Open',
    draft: 'Draft',
    uncollectible: 'Uncollectible',
    void: 'Void',
  };
  return labels[status] || status;
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
        <h1 class="text-3xl font-bold tracking-tight">Invoices</h1>
        <p class="text-muted-foreground">View and download your organization's invoices.</p>
      </div>
      <Button variant="outline" @click="handleRefresh" :disabled="isLoading">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': isLoading }" />
        Refresh
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
          <p class="font-medium">Failed to load invoices</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="handleRefresh">Retry</Button>
      </CardContent>
    </Card>

    <!-- Content -->
    <template v-else>
      <!-- Summary Cards -->
      <div class="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Total Invoices</CardTitle>
            <Receipt class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ invoices.length }}</div>
            <p class="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Paid</CardTitle>
            <CreditCard class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ paidInvoices.length }}</div>
            <p class="text-xs text-muted-foreground">
              {{ invoices.length > 0 ? formatAmount(totalPaid, paidInvoices[0]?.currency || 'EUR') : '€0.00' }} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Open</CardTitle>
            <Clock class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ openInvoices.length }}</div>
            <p class="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-4">
        <Select :model-value="statusFilter" @update:model-value="handleStatusChange">
          <SelectTrigger class="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Invoices Table -->
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            A list of all invoices for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <!-- Empty State -->
          <div v-if="!hasInvoices" class="flex flex-col items-center justify-center py-12 text-center">
            <FileText class="h-12 w-12 text-muted-foreground mb-4" />
            <h3 class="text-lg font-medium">No invoices yet</h3>
            <p class="text-sm text-muted-foreground max-w-sm mt-1">
              Invoices will appear here once you have billing activity.
            </p>
          </div>

          <!-- Table -->
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead class="text-right">Amount</TableHead>
                <TableHead class="text-right">Actions</TableHead>
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
                    >
                      <ExternalLink class="h-4 w-4" />
                      <span class="sr-only">View</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="handleDownload(invoice.id)"
                      :disabled="isDownloading === invoice.id"
                    >
                      <Download
                        class="h-4 w-4"
                        :class="{ 'animate-pulse': isDownloading === invoice.id }"
                      />
                      <span class="sr-only">Download PDF</span>
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

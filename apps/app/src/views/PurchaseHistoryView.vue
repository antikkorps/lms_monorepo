<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { usePayments } from '@/composables/usePayments';
import { useToast } from '@/composables/useToast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ShoppingBag,
  RefreshCcw,
  ExternalLink,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-vue-next';

const { t } = useI18n();
const toast = useToast();
const {
  getPurchases,
  requestRefund,
  isEligibleForAutoRefund,
  isProcessing,
  error,
} = usePayments();

interface Purchase {
  id: string;
  courseId: string;
  amount: string;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  purchasedAt: string | null;
  createdAt: string;
  refundRequestStatus?: string;
  refundRequestedAt?: string | null;
  refundRejectionReason?: string | null;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl: string | null;
  } | null;
}

const purchases = ref<Purchase[]>([]);
const isLoading = ref(true);
const showRefundDialog = ref(false);
const selectedPurchase = ref<Purchase | null>(null);
const refundReason = ref('');

onMounted(async () => {
  await loadPurchases();
});

async function loadPurchases() {
  isLoading.value = true;
  const result = await getPurchases();
  if (result) {
    purchases.value = result.purchases;
  }
  isLoading.value = false;
}

function formatPrice(amount: string | number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(Number(amount));
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr));
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'refunded':
      return 'secondary';
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getRefundRequestStatusInfo(purchase: Purchase) {
  const status = purchase.refundRequestStatus;
  if (!status || status === 'none') return null;

  switch (status) {
    case 'pending':
      return {
        label: t('payment.refund.statusPending', 'Refund pending review'),
        icon: Clock,
        variant: 'outline' as const,
      };
    case 'approved':
    case 'auto_approved':
      return {
        label: t('payment.refund.statusApproved', 'Refunded'),
        icon: CheckCircle,
        variant: 'secondary' as const,
      };
    case 'rejected':
      return {
        label: t('payment.refund.statusRejected', 'Refund rejected'),
        icon: XCircle,
        variant: 'destructive' as const,
      };
    default:
      return null;
  }
}

function canRequestRefund(purchase: Purchase): boolean {
  // Can only request refund for completed purchases
  if (purchase.status !== 'completed') return false;
  // Cannot request if already has a pending/approved request
  const status = purchase.refundRequestStatus;
  if (status === 'pending' || status === 'approved' || status === 'auto_approved') return false;
  return true;
}

function openRefundDialog(purchase: Purchase) {
  selectedPurchase.value = purchase;
  refundReason.value = '';
  showRefundDialog.value = true;
}

async function submitRefundRequest() {
  if (!selectedPurchase.value || !refundReason.value.trim()) return;

  const result = await requestRefund(selectedPurchase.value.id, refundReason.value);

  if (result) {
    showRefundDialog.value = false;
    if (result.refundRequestStatus === 'auto_approved') {
      toast.success(t('payment.refund.autoApproved', 'Your refund has been processed automatically.'));
    } else {
      toast.success(t('payment.refund.requestSubmitted', 'Your refund request has been submitted for review.'));
    }
    await loadPurchases();
  } else if (error.value) {
    toast.error(error.value);
  }
}

const isAutoRefundEligible = computed(() => {
  if (!selectedPurchase.value) return false;
  return isEligibleForAutoRefund(selectedPurchase.value);
});
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <div class="mb-8">
      <h1 class="text-3xl font-bold">{{ t('payment.history.title', 'Purchase History') }}</h1>
      <p class="text-muted-foreground mt-2">
        {{ t('payment.history.subtitle', 'View your course purchases and request refunds') }}
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Empty state -->
    <Card v-else-if="purchases.length === 0">
      <CardContent class="flex flex-col items-center py-12">
        <ShoppingBag class="h-12 w-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium">{{ t('payment.history.empty', 'No purchases yet') }}</h3>
        <p class="text-muted-foreground text-center mt-2">
          {{ t('payment.history.emptyDescription', 'When you purchase a course, it will appear here.') }}
        </p>
        <RouterLink to="/courses" class="mt-4">
          <Button>{{ t('payment.history.browseCourses', 'Browse Courses') }}</Button>
        </RouterLink>
      </CardContent>
    </Card>

    <!-- Purchases list -->
    <div v-else class="space-y-4">
      <Card v-for="purchase in purchases" :key="purchase.id">
        <CardContent class="p-6">
          <div class="flex flex-col sm:flex-row sm:items-start gap-4">
            <!-- Course thumbnail -->
            <div class="shrink-0 w-24 h-16 rounded bg-muted flex items-center justify-center overflow-hidden">
              <img
                v-if="purchase.course?.thumbnailUrl"
                :src="purchase.course.thumbnailUrl"
                :alt="purchase.course?.title"
                class="w-full h-full object-cover"
              />
              <ShoppingBag v-else class="h-6 w-6 text-muted-foreground" />
            </div>

            <!-- Purchase info -->
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <h3 class="font-medium truncate">
                  {{ purchase.course?.title || t('payment.history.unknownCourse', 'Unknown Course') }}
                </h3>
                <Badge :variant="getStatusBadgeVariant(purchase.status)">
                  {{ purchase.status }}
                </Badge>
              </div>

              <div class="text-sm text-muted-foreground space-y-1">
                <p>{{ formatPrice(purchase.amount, purchase.currency) }}</p>
                <p v-if="purchase.purchasedAt">
                  {{ t('payment.history.purchasedOn', 'Purchased on') }}
                  {{ formatDate(purchase.purchasedAt) }}
                </p>
              </div>

              <!-- Refund request status -->
              <div v-if="getRefundRequestStatusInfo(purchase)" class="mt-2">
                <Badge :variant="getRefundRequestStatusInfo(purchase)!.variant" class="gap-1">
                  <component :is="getRefundRequestStatusInfo(purchase)!.icon" class="h-3 w-3" />
                  {{ getRefundRequestStatusInfo(purchase)!.label }}
                </Badge>
                <p
                  v-if="purchase.refundRequestStatus === 'rejected' && purchase.refundRejectionReason"
                  class="text-sm text-destructive mt-1"
                >
                  {{ t('payment.refund.rejectionReason', 'Reason') }}: {{ purchase.refundRejectionReason }}
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col gap-2 shrink-0">
              <RouterLink v-if="purchase.course && purchase.status === 'completed'" :to="`/courses/${purchase.course.slug}`">
                <Button variant="outline" size="sm" class="w-full gap-1">
                  <ExternalLink class="h-4 w-4" />
                  {{ t('payment.history.viewCourse', 'View Course') }}
                </Button>
              </RouterLink>
              <Button
                v-if="canRequestRefund(purchase)"
                variant="ghost"
                size="sm"
                class="gap-1"
                @click="openRefundDialog(purchase)"
              >
                <RefreshCcw class="h-4 w-4" />
                {{ t('payment.refund.request', 'Request Refund') }}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Refund Request Dialog -->
    <Dialog v-model:open="showRefundDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('payment.refund.dialogTitle', 'Request a Refund') }}</DialogTitle>
          <DialogDescription>
            <template v-if="isAutoRefundEligible">
              {{ t('payment.refund.autoEligible', 'Your purchase is eligible for an instant refund.') }}
            </template>
            <template v-else>
              {{ t('payment.refund.manualReview', 'Your request will be reviewed by our team. This usually takes 1-2 business days.') }}
            </template>
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div v-if="selectedPurchase" class="p-3 rounded-lg bg-muted">
            <p class="font-medium">{{ selectedPurchase.course?.title }}</p>
            <p class="text-sm text-muted-foreground">
              {{ formatPrice(selectedPurchase.amount, selectedPurchase.currency) }}
            </p>
          </div>

          <div v-if="isAutoRefundEligible" class="flex items-start gap-2 p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle class="h-5 w-5 shrink-0 mt-0.5" />
            <p class="text-sm">
              {{ t('payment.refund.instantInfo', 'Since you purchased less than 1 hour ago, your refund will be processed immediately.') }}
            </p>
          </div>

          <div v-else class="flex items-start gap-2 p-3 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertCircle class="h-5 w-5 shrink-0 mt-0.5" />
            <p class="text-sm">
              {{ t('payment.refund.reviewInfo', 'Since more than 1 hour has passed, your request will need to be reviewed by an administrator.') }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="reason">{{ t('payment.refund.reasonLabel', 'Why do you want a refund?') }}</Label>
            <Textarea
              id="reason"
              v-model="refundReason"
              :placeholder="t('payment.refund.reasonPlaceholder', 'Please explain your reason for requesting a refund...')"
              rows="4"
            />
            <p class="text-xs text-muted-foreground">
              {{ t('payment.refund.reasonHint', 'Minimum 10 characters') }}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showRefundDialog = false">
            {{ t('common.cancel', 'Cancel') }}
          </Button>
          <Button
            :disabled="refundReason.length < 10 || isProcessing"
            @click="submitRefundRequest"
          >
            <Loader2 v-if="isProcessing" class="mr-2 h-4 w-4 animate-spin" />
            {{ isAutoRefundEligible
              ? t('payment.refund.submitInstant', 'Get Instant Refund')
              : t('payment.refund.submitReview', 'Submit Request')
            }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useApi, ApiRequestError } from '@/composables/useApi';
import { useToast } from '@/composables/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Select } from '@/components/ui/select';
import {
  RefreshCcw,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  User,
  BookOpen,
} from 'lucide-vue-next';

const { t } = useI18n();
const api = useApi();
const toast = useToast();

interface RefundRequest {
  id: string;
  amount: number;
  currency: string;
  status: string;
  refundRequestStatus: string;
  refundRequestedAt: string;
  refundRequestReason: string;
  purchasedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  course: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

interface RefundRequestsResponse {
  requests: RefundRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const requests = ref<RefundRequest[]>([]);
const isLoading = ref(true);
const statusFilter = ref('pending');
const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 0 });

// Review dialog
const showReviewDialog = ref(false);
const selectedRequest = ref<RefundRequest | null>(null);
const reviewAction = ref<'approve' | 'reject'>('approve');
const rejectionReason = ref('');
const isSubmitting = ref(false);

onMounted(async () => {
  await loadRequests();
});

async function loadRequests() {
  isLoading.value = true;
  try {
    const response = await api.get<RefundRequestsResponse>('/payments/refund-requests', {
      status: statusFilter.value,
      page: pagination.value.page,
      limit: pagination.value.limit,
    });
    requests.value = response.requests;
    pagination.value = response.pagination;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to load refund requests');
  } finally {
    isLoading.value = false;
  }
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr));
}

function getTimeSincePurchase(purchasedAt: string): string {
  const purchaseDate = new Date(purchasedAt);
  const now = new Date();
  const diffMs = now.getTime() - purchaseDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
}

function openReviewDialog(request: RefundRequest, action: 'approve' | 'reject') {
  selectedRequest.value = request;
  reviewAction.value = action;
  rejectionReason.value = '';
  showReviewDialog.value = true;
}

async function submitReview() {
  if (!selectedRequest.value) return;
  if (reviewAction.value === 'reject' && !rejectionReason.value.trim()) {
    toast.error(t('admin.refunds.rejectionReasonRequired', 'Please provide a reason for rejection'));
    return;
  }

  isSubmitting.value = true;
  try {
    await api.post(`/payments/${selectedRequest.value.id}/review-refund`, {
      action: reviewAction.value,
      rejectionReason: reviewAction.value === 'reject' ? rejectionReason.value : undefined,
    });

    showReviewDialog.value = false;
    toast.success(
      reviewAction.value === 'approve'
        ? t('admin.refunds.approved', 'Refund approved and processed')
        : t('admin.refunds.rejected', 'Refund request rejected')
    );
    await loadRequests();
  } catch (err) {
    toast.error(err instanceof ApiRequestError ? err.message : 'Failed to process review');
  } finally {
    isSubmitting.value = false;
  }
}

function onStatusFilterChange(value: string) {
  statusFilter.value = value;
  pagination.value.page = 1;
  loadRequests();
}
</script>

<template>
  <div class="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-8">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold">{{ t('admin.refunds.title', 'Refund Requests') }}</h1>
        <p class="text-sm sm:text-base text-muted-foreground mt-1">
          {{ t('admin.refunds.subtitle', 'Review and manage refund requests from learners') }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Select :model-value="statusFilter" class="w-32 sm:w-40" @update:model-value="onStatusFilterChange">
          <option value="pending">{{ t('admin.refunds.filterPending', 'Pending') }}</option>
          <option value="reviewed">{{ t('admin.refunds.filterReviewed', 'Reviewed') }}</option>
          <option value="all">{{ t('admin.refunds.filterAll', 'All') }}</option>
        </Select>

        <Button variant="outline" size="icon" @click="loadRequests">
          <RefreshCcw class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Empty state -->
    <Card v-else-if="requests.length === 0">
      <CardContent class="flex flex-col items-center py-12">
        <RefreshCcw class="h-12 w-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium">{{ t('admin.refunds.empty', 'No refund requests') }}</h3>
        <p class="text-muted-foreground text-center mt-2">
          {{ statusFilter === 'pending'
            ? t('admin.refunds.emptyPending', 'There are no pending refund requests.')
            : t('admin.refunds.emptyAll', 'No refund requests found.')
          }}
        </p>
      </CardContent>
    </Card>

    <!-- Requests list -->
    <div v-else class="space-y-3 sm:space-y-4">
      <Card v-for="request in requests" :key="request.id">
        <CardContent class="p-4 sm:p-6">
          <!-- Mobile: Stack everything vertically -->
          <!-- Desktop: Side by side layout -->
          <div class="space-y-3 sm:space-y-4">
            <!-- Header: User + Status + Amount -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div class="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User class="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
                <div class="min-w-0">
                  <p class="font-medium text-sm sm:text-base truncate">
                    {{ request.user ? `${request.user.firstName} ${request.user.lastName}` : 'Unknown' }}
                  </p>
                  <p class="text-xs sm:text-sm text-muted-foreground truncate">
                    {{ request.user?.email }}
                  </p>
                </div>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="outline" class="text-xs sm:text-sm">
                  {{ formatPrice(request.amount, request.currency) }}
                </Badge>
                <Badge
                  :variant="request.refundRequestStatus === 'pending' ? 'outline' :
                    request.refundRequestStatus === 'approved' || request.refundRequestStatus === 'auto_approved' ? 'secondary' :
                    'destructive'"
                  class="gap-1 text-xs"
                >
                  <Clock v-if="request.refundRequestStatus === 'pending'" class="h-3 w-3" />
                  <CheckCircle v-else-if="request.refundRequestStatus === 'approved' || request.refundRequestStatus === 'auto_approved'" class="h-3 w-3" />
                  <XCircle v-else class="h-3 w-3" />
                  {{ request.refundRequestStatus }}
                </Badge>
              </div>
            </div>

            <!-- Course -->
            <div class="flex items-center gap-2 text-sm">
              <BookOpen class="h-4 w-4 text-muted-foreground shrink-0" />
              <span class="font-medium truncate">{{ request.course?.title || 'Unknown Course' }}</span>
            </div>

            <!-- Reason -->
            <div class="bg-muted rounded-lg p-2.5 sm:p-3">
              <p class="text-xs sm:text-sm font-medium mb-1">{{ t('admin.refunds.reason', 'Reason') }}:</p>
              <p class="text-xs sm:text-sm text-muted-foreground">{{ request.refundRequestReason }}</p>
            </div>

            <!-- Timestamps -->
            <div class="flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <div class="flex items-center gap-1">
                <Clock class="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{{ t('admin.refunds.requestedAt', 'Requested') }}: {{ formatDate(request.refundRequestedAt) }}</span>
              </div>
              <div>
                {{ t('admin.refunds.purchasedAt', 'Purchased') }}: {{ getTimeSincePurchase(request.purchasedAt) }}
              </div>
            </div>

            <!-- Actions -->
            <div v-if="request.refundRequestStatus === 'pending'" class="flex gap-2 pt-1">
              <Button
                variant="default"
                size="sm"
                class="flex-1 sm:flex-none gap-1"
                @click="openReviewDialog(request, 'approve')"
              >
                <CheckCircle class="h-4 w-4" />
                <span class="sm:inline">{{ t('admin.refunds.approve', 'Approve') }}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="flex-1 sm:flex-none gap-1"
                @click="openReviewDialog(request, 'reject')"
              >
                <XCircle class="h-4 w-4" />
                <span class="sm:inline">{{ t('admin.refunds.reject', 'Reject') }}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Review Dialog -->
    <Dialog v-model:open="showReviewDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {{ reviewAction === 'approve'
              ? t('admin.refunds.approveTitle', 'Approve Refund')
              : t('admin.refunds.rejectTitle', 'Reject Refund Request')
            }}
          </DialogTitle>
          <DialogDescription>
            {{ reviewAction === 'approve'
              ? t('admin.refunds.approveDesc', 'This will process the refund through Stripe and revoke course access.')
              : t('admin.refunds.rejectDesc', 'The user will be notified that their request was rejected.')
            }}
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedRequest" class="py-4 space-y-4">
          <div class="p-3 rounded-lg bg-muted">
            <div class="flex justify-between items-center">
              <span class="font-medium">{{ selectedRequest.course?.title }}</span>
              <Badge variant="outline">{{ formatPrice(selectedRequest.amount, selectedRequest.currency) }}</Badge>
            </div>
            <p class="text-sm text-muted-foreground mt-1">
              {{ selectedRequest.user?.firstName }} {{ selectedRequest.user?.lastName }} ({{ selectedRequest.user?.email }})
            </p>
          </div>

          <div v-if="reviewAction === 'reject'" class="space-y-2">
            <Label for="rejectionReason">{{ t('admin.refunds.rejectionReasonLabel', 'Reason for rejection') }}</Label>
            <Textarea
              id="rejectionReason"
              v-model="rejectionReason"
              :placeholder="t('admin.refunds.rejectionReasonPlaceholder', 'Explain why this request is being rejected...')"
              rows="3"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showReviewDialog = false">
            {{ t('common.cancel', 'Cancel') }}
          </Button>
          <Button
            :variant="reviewAction === 'approve' ? 'default' : 'destructive'"
            :disabled="isSubmitting || (reviewAction === 'reject' && !rejectionReason.trim())"
            @click="submitReview"
          >
            <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
            {{ reviewAction === 'approve'
              ? t('admin.refunds.confirmApprove', 'Approve & Process Refund')
              : t('admin.refunds.confirmReject', 'Reject Request')
            }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

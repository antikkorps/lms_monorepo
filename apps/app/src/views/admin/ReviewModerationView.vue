<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-vue-next';
import StarRating from '@/components/reviews/StarRating.vue';
import { useReviews, type Review } from '@/composables/useReviews';
import { useToast } from '@/composables/useToast';

const { t } = useI18n();
const toast = useToast();
const { reviews, pagination, isLoading, error, fetchPendingReviews, moderateReview } = useReviews();
const moderatingId = ref<string | null>(null);

onMounted(() => {
  fetchPendingReviews();
});

async function handleModerate(review: Review, action: 'approve' | 'reject') {
  moderatingId.value = review.id;
  try {
    await moderateReview(review.id, action);
    toast.success(action === 'approve' ? t('reviews.toast.approved') : t('reviews.toast.rejected'));
    await fetchPendingReviews(pagination.value?.page || 1);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : t('reviews.toast.moderateError'));
  } finally {
    moderatingId.value = null;
  }
}

function loadPage(page: number) {
  fetchPendingReviews(page);
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">{{ t('reviews.moderation.title') }}</h1>
      <p class="text-muted-foreground">{{ t('reviews.moderation.subtitle') }}</p>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Error -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">{{ t('reviews.moderation.loadError') }}</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchPendingReviews()">
          {{ t('reviews.moderation.retry') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Empty -->
    <Card v-else-if="reviews.length === 0">
      <CardContent class="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 class="mb-4 h-12 w-12 text-green-500" />
        <h3 class="text-lg font-semibold">{{ t('reviews.moderation.emptyTitle') }}</h3>
        <p class="text-muted-foreground">{{ t('reviews.moderation.emptyMessage') }}</p>
      </CardContent>
    </Card>

    <!-- Review List -->
    <template v-else>
      <div class="space-y-4">
        <Card v-for="review in reviews" :key="review.id">
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-base">
                  {{ review.course?.title || t('reviews.moderation.unknownCourse') }}
                </CardTitle>
                <p class="text-sm text-muted-foreground">
                  {{ t('reviews.moderation.by') }} {{ review.user ? `${review.user.firstName} ${review.user.lastName}` : t('reviews.anonymous') }}
                  · {{ new Date(review.createdAt).toLocaleDateString() }}
                </p>
              </div>
              <StarRating :model-value="review.rating" readonly size="sm" />
            </div>
          </CardHeader>
          <CardContent>
            <h4 v-if="review.title" class="font-medium text-sm mb-1">{{ review.title }}</h4>
            <p v-if="review.comment" class="text-sm text-muted-foreground mb-4">{{ review.comment }}</p>

            <div class="flex gap-2">
              <Button
                size="sm"
                :disabled="moderatingId === review.id"
                @click="handleModerate(review, 'approve')"
              >
                <Loader2 v-if="moderatingId === review.id" class="mr-1 h-4 w-4 animate-spin" />
                <CheckCircle2 v-else class="mr-1 h-4 w-4" />
                {{ t('reviews.moderation.approve') }}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                :disabled="moderatingId === review.id"
                @click="handleModerate(review, 'reject')"
              >
                <XCircle class="mr-1 h-4 w-4" />
                {{ t('reviews.moderation.reject') }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Pagination -->
      <div v-if="pagination && pagination.totalPages > 1" class="flex justify-center gap-2">
        <Button
          v-for="page in pagination.totalPages"
          :key="page"
          size="sm"
          :variant="page === pagination.page ? 'default' : 'outline'"
          @click="loadPage(page)"
        >
          {{ page }}
        </Button>
      </div>
    </template>
  </div>
</template>

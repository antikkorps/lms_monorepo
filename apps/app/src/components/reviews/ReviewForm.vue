<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-vue-next';
import StarRating from './StarRating.vue';
import { useReviews, type MyReview } from '@/composables/useReviews';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  courseId: string;
}>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const { t } = useI18n();
const toast = useToast();
const { myReview, fetchMyReview, submitReview, updateReview, deleteReview } = useReviews();

const rating = ref(0);
const title = ref('');
const comment = ref('');
const isSubmitting = ref(false);
const isDeleting = ref(false);

const isEditing = computed(() => !!myReview.value);
const canSubmit = computed(() => rating.value >= 1 && rating.value <= 5);

onMounted(async () => {
  await fetchMyReview(props.courseId);
  if (myReview.value) {
    rating.value = myReview.value.rating;
    title.value = myReview.value.title || '';
    comment.value = myReview.value.comment || '';
  }
});

async function handleSubmit() {
  if (!canSubmit.value) return;
  isSubmitting.value = true;

  try {
    if (isEditing.value && myReview.value) {
      await updateReview(myReview.value.id, {
        rating: rating.value,
        title: title.value || undefined,
        comment: comment.value || undefined,
      });
      toast.success(t('reviews.toast.updated'));
    } else {
      await submitReview({
        courseId: props.courseId,
        rating: rating.value,
        title: title.value || undefined,
        comment: comment.value || undefined,
      });
      toast.success(t('reviews.toast.submitted'));
    }
    emit('updated');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : t('reviews.toast.submitError'));
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDelete() {
  if (!myReview.value) return;
  isDeleting.value = true;

  try {
    await deleteReview(myReview.value.id);
    rating.value = 0;
    title.value = '';
    comment.value = '';
    toast.success(t('reviews.toast.deleted'));
    emit('updated');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : t('reviews.toast.deleteError'));
  } finally {
    isDeleting.value = false;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'approved':
      return t('reviews.status.approved');
    case 'rejected':
      return t('reviews.status.rejected');
    case 'pending':
    default:
      return t('reviews.status.pending');
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved':
      return 'text-green-600 bg-green-100';
    case 'rejected':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-yellow-600 bg-yellow-100';
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center justify-between">
        <CardTitle class="text-lg">{{ isEditing ? t('reviews.yourReview') : t('reviews.writeReview') }}</CardTitle>
        <span
          v-if="myReview"
          :class="['rounded-full px-2.5 py-0.5 text-xs font-medium', getStatusColor(myReview.status)]"
        >
          {{ getStatusLabel(myReview.status) }}
        </span>
      </div>
    </CardHeader>
    <CardContent>
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <!-- Rating -->
        <div>
          <label class="text-sm font-medium">{{ t('reviews.rating') }}</label>
          <div class="mt-1">
            <StarRating v-model="rating" size="lg" />
          </div>
        </div>

        <!-- Title -->
        <div>
          <label class="text-sm font-medium" for="review-title">{{ t('reviews.titleLabel') }}</label>
          <input
            id="review-title"
            v-model="title"
            type="text"
            maxlength="255"
            :placeholder="t('reviews.titlePlaceholder')"
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <!-- Comment -->
        <div>
          <label class="text-sm font-medium" for="review-comment">{{ t('reviews.commentLabel') }}</label>
          <textarea
            id="review-comment"
            v-model="comment"
            rows="3"
            maxlength="5000"
            :placeholder="t('reviews.commentPlaceholder')"
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <Button type="submit" :disabled="!canSubmit || isSubmitting">
            <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
            {{ isEditing ? t('reviews.updateReview') : t('reviews.submitReview') }}
          </Button>
          <Button
            v-if="isEditing"
            type="button"
            variant="destructive"
            size="sm"
            :disabled="isDeleting"
            @click="handleDelete"
          >
            <Loader2 v-if="isDeleting" class="mr-2 h-4 w-4 animate-spin" />
            <Trash2 v-else class="mr-1 h-4 w-4" />
            {{ t('reviews.delete') }}
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</template>

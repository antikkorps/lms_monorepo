<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import StarRating from './StarRating.vue';
import type { Review } from '@/composables/useReviews';

const props = defineProps<{
  review: Review;
}>();

const { t } = useI18n();

const authorName = computed(() => {
  if (!props.review.user) return t('reviews.anonymous');
  return `${props.review.user.firstName} ${props.review.user.lastName}`;
});

const initials = computed(() => {
  if (!props.review.user) return '?';
  return `${props.review.user.firstName[0]}${props.review.user.lastName[0]}`.toUpperCase();
});

const formattedDate = computed(() => {
  return new Date(props.review.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
});
</script>

<template>
  <div class="flex gap-4 py-4">
    <!-- Avatar -->
    <div class="shrink-0">
      <div
        v-if="review.user?.avatarUrl"
        class="h-10 w-10 rounded-full overflow-hidden"
      >
        <img :src="review.user.avatarUrl" :alt="authorName" class="h-full w-full object-cover" />
      </div>
      <div
        v-else
        class="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium"
      >
        {{ initials }}
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between gap-2">
        <div>
          <span class="font-medium text-sm">{{ authorName }}</span>
          <span class="mx-2 text-muted-foreground">·</span>
          <span class="text-xs text-muted-foreground">{{ formattedDate }}</span>
        </div>
        <StarRating :model-value="review.rating" readonly size="sm" />
      </div>
      <h4 v-if="review.title" class="mt-1 font-medium text-sm">{{ review.title }}</h4>
      <p v-if="review.comment" class="mt-1 text-sm text-muted-foreground leading-relaxed">
        {{ review.comment }}
      </p>
    </div>
  </div>
</template>

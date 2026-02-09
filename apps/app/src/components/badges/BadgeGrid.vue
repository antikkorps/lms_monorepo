<script setup lang="ts">
import type { Badge, BadgeCategory } from '@/composables/useBadges';
import { useI18n } from 'vue-i18n';
import BadgeCard from './BadgeCard.vue';
import { computed } from 'vue';

interface Props {
  badges: Badge[];
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  maxItems?: number;
  groupByCategory?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showDetails: true,
  maxItems: 0,
  groupByCategory: false,
});

const emit = defineEmits<{
  (e: 'select', badge: Badge): void;
}>();

const { t } = useI18n();

const displayedBadges = computed(() => {
  if (props.maxItems > 0) {
    return props.badges.slice(0, props.maxItems);
  }
  return props.badges;
});

const groupedBadges = computed(() => {
  if (!props.groupByCategory) return null;

  const groups: Record<BadgeCategory, Badge[]> = {
    course: [],
    streak: [],
    quiz: [],
    milestone: [],
    special: [],
  };

  for (const badge of displayedBadges.value) {
    groups[badge.category].push(badge);
  }

  return groups;
});

function getCategoryLabel(category: BadgeCategory): string {
  return t(`badges.categoryLabels.${category}`);
}

function handleBadgeClick(badge: Badge) {
  emit('select', badge);
}
</script>

<template>
  <!-- Grouped by category -->
  <div v-if="groupByCategory && groupedBadges" class="space-y-6">
    <template v-for="(badges, category) in groupedBadges" :key="category">
      <div v-if="badges.length > 0">
        <h3 class="text-sm font-medium text-muted-foreground mb-3">
          {{ getCategoryLabel(category as BadgeCategory) }}
        </h3>
        <div
          class="grid gap-4"
          :class="{
            'grid-cols-4 sm:grid-cols-6 md:grid-cols-8': size === 'sm',
            'grid-cols-3 sm:grid-cols-4 md:grid-cols-6': size === 'md',
            'grid-cols-2 sm:grid-cols-3 md:grid-cols-4': size === 'lg',
          }"
        >
          <BadgeCard
            v-for="badge in badges"
            :key="badge.id"
            :badge="badge"
            :size="size"
            :show-details="showDetails"
            @click="handleBadgeClick"
          />
        </div>
      </div>
    </template>
  </div>

  <!-- Flat list -->
  <div
    v-else
    class="grid gap-4"
    :class="{
      'grid-cols-4 sm:grid-cols-6 md:grid-cols-8': size === 'sm',
      'grid-cols-3 sm:grid-cols-4 md:grid-cols-6': size === 'md',
      'grid-cols-2 sm:grid-cols-3 md:grid-cols-4': size === 'lg',
    }"
  >
    <BadgeCard
      v-for="badge in displayedBadges"
      :key="badge.id"
      :badge="badge"
      :size="size"
      :show-details="showDetails"
      @click="handleBadgeClick"
    />
  </div>
</template>

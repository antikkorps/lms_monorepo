<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePaths } from '../composables/usePaths';
import { BookOpen, Clock, ChevronRight } from 'lucide-vue-next';

const { t } = useI18n();
const { paths, isLoading, fetchPaths } = usePaths();

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

onMounted(() => {
  fetchPaths();
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-foreground">{{ t('paths.catalog.title') }}</h1>
      <p class="text-muted-foreground mt-1">{{ t('paths.catalog.subtitle') }}</p>
    </div>

    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 6" :key="i" class="bg-card border border-border rounded-xl p-6 animate-pulse">
        <div class="h-4 bg-muted rounded w-3/4 mb-3" />
        <div class="h-3 bg-muted rounded w-full mb-2" />
        <div class="h-3 bg-muted rounded w-2/3" />
      </div>
    </div>

    <div v-else-if="paths.length === 0" class="text-center py-16">
      <BookOpen class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <p class="text-muted-foreground">{{ t('paths.catalog.empty') }}</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <router-link
        v-for="path in paths"
        :key="path.id"
        :to="`/paths/${path.slug}`"
        class="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors group"
      >
        <div v-if="path.thumbnailUrl" class="aspect-video rounded-lg overflow-hidden mb-4 bg-muted">
          <img :src="path.thumbnailUrl" :alt="path.title" class="w-full h-full object-cover" loading="lazy" decoding="async" />
        </div>
        <div v-else class="aspect-video rounded-lg mb-4 bg-muted flex items-center justify-center">
          <BookOpen class="w-8 h-8 text-muted-foreground" />
        </div>

        <h3 class="font-semibold text-foreground group-hover:text-primary transition-colors">
          {{ path.title }}
        </h3>
        <p v-if="path.description" class="text-sm text-muted-foreground mt-1 line-clamp-2">
          {{ path.description }}
        </p>

        <div class="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <span class="flex items-center gap-1">
            <BookOpen class="w-4 h-4" />
            {{ t('paths.catalog.courses', { count: path.coursesCount }) }}
          </span>
          <span v-if="path.estimatedDuration > 0" class="flex items-center gap-1">
            <Clock class="w-4 h-4" />
            {{ formatDuration(path.estimatedDuration) }}
          </span>
        </div>

        <div class="flex items-center justify-end mt-4 text-sm text-primary font-medium">
          {{ t('paths.catalog.viewPath') }}
          <ChevronRight class="w-4 h-4 ml-1" />
        </div>
      </router-link>
    </div>
  </div>
</template>

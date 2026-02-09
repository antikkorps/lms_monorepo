<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  AlertCircle,
  BookOpen,
  Filter,
  SlidersHorizontal,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next';
import CourseCard from '@/components/courses/CourseCard.vue';
import { CourseCardSkeleton } from '@/components/skeletons';
import { useCourses, type CourseFilter, type CourseSortBy } from '@/composables/useCourses';

const { t } = useI18n();
const route = useRoute();

const {
  isLoading,
  error,
  courses,
  filter,
  sortBy,
  searchQuery,
  category,
  level,
  minRating,
  totalCourses,
  filteredCount,
  freeCourses,
  hasActiveFilters,
  fetchCourses,
  setFilter,
  setSortBy,
  setSearchQuery,
  setCategory,
  setLevel,
  setMinRating,
  clearFilters,
} = useCourses();

const showAdvancedFilters = ref(false);

const categoryOptions = [
  'development', 'design', 'business', 'marketing',
  'data_science', 'language', 'personal_development', 'other',
] as const;

const levelOptions = [
  'beginner', 'intermediate', 'advanced', 'all_levels',
] as const;

const ratingOptions = [
  { value: 4, label: '4+' },
  { value: 4.5, label: '4.5+' },
] as const;

const searchInput = ref('');
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

function handleSearch(event: Event): void {
  const target = event.target as HTMLInputElement;
  searchInput.value = target.value;

  // Debounce search
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    setSearchQuery(searchInput.value);
  }, 300);
}

const filterOptions = computed(() => [
  { value: 'all' as CourseFilter, label: t('courses.catalog.filters.all') },
  { value: 'free' as CourseFilter, label: t('courses.catalog.filters.free') },
  { value: 'paid' as CourseFilter, label: t('courses.catalog.filters.paid') },
]);

const sortOptions = computed(() => [
  { value: 'newest' as CourseSortBy, label: t('courses.catalog.sort.newest') },
  { value: 'popular' as CourseSortBy, label: t('courses.catalog.sort.popular') },
  { value: 'title' as CourseSortBy, label: t('courses.catalog.sort.title') },
  { value: 'duration' as CourseSortBy, label: t('courses.catalog.sort.duration') },
]);

onMounted(() => {
  const urlSearch = route.query.search as string | undefined;
  if (urlSearch) {
    searchInput.value = urlSearch;
    setSearchQuery(urlSearch);
  }
  fetchCourses();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight">{{ t('courses.catalog.title') }}</h1>
      <p class="text-muted-foreground">
        {{ t('courses.catalog.subtitle', { count: totalCourses }) }}
        <span v-if="freeCourses > 0">{{ t('courses.catalog.subtitleFree', { count: freeCourses }) }}</span>
      </p>
    </div>

    <!-- Search and Filters -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <!-- Search -->
      <div class="relative w-full sm:max-w-sm">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          :placeholder="t('courses.catalog.searchPlaceholder')"
          class="pl-9"
          :value="searchInput"
          @input="handleSearch"
        />
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-2">
        <!-- Price filter -->
        <div class="flex items-center rounded-lg border p-1">
          <Button
            v-for="option in filterOptions"
            :key="option.value"
            :variant="filter === option.value ? 'secondary' : 'ghost'"
            size="sm"
            class="h-7 px-3"
            @click="setFilter(option.value)"
          >
            {{ option.label }}
          </Button>
        </div>

        <!-- Sort dropdown (simplified as buttons for now) -->
        <div class="hidden items-center gap-1 lg:flex">
          <SlidersHorizontal class="h-4 w-4 text-muted-foreground" />
          <select
            :value="sortBy"
            class="h-8 rounded-md border bg-background px-2 text-sm"
            @change="setSortBy(($event.target as HTMLSelectElement).value as CourseSortBy)"
          >
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <!-- Toggle advanced filters -->
        <Button
          variant="outline"
          size="sm"
          class="gap-1"
          @click="showAdvancedFilters = !showAdvancedFilters"
        >
          <Filter class="h-4 w-4" />
          <span class="hidden sm:inline">{{ showAdvancedFilters ? t('courses.catalog.hideFilters') : t('courses.catalog.advancedFilters') }}</span>
          <component :is="showAdvancedFilters ? ChevronUp : ChevronDown" class="h-3 w-3" />
        </Button>
      </div>
    </div>

    <!-- Advanced Filters -->
    <div v-if="showAdvancedFilters" class="space-y-3 rounded-lg border p-4">
      <!-- Category -->
      <div>
        <p class="mb-2 text-sm font-medium text-muted-foreground">{{ t('courses.catalog.category') }}</p>
        <div class="flex flex-wrap gap-2">
          <Badge
            :variant="category === null ? 'default' : 'outline'"
            class="cursor-pointer"
            @click="setCategory(null)"
          >
            {{ t('courses.catalog.allCategories') }}
          </Badge>
          <Badge
            v-for="cat in categoryOptions"
            :key="cat"
            :variant="category === cat ? 'default' : 'outline'"
            class="cursor-pointer"
            @click="setCategory(category === cat ? null : cat)"
          >
            {{ t(`courses.categories.${cat}`) }}
          </Badge>
        </div>
      </div>

      <!-- Level -->
      <div>
        <p class="mb-2 text-sm font-medium text-muted-foreground">{{ t('courses.catalog.level') }}</p>
        <div class="flex flex-wrap gap-2">
          <Badge
            :variant="level === null ? 'default' : 'outline'"
            class="cursor-pointer"
            @click="setLevel(null)"
          >
            {{ t('courses.catalog.allLevels') }}
          </Badge>
          <Badge
            v-for="lvl in levelOptions"
            :key="lvl"
            :variant="level === lvl ? 'default' : 'outline'"
            class="cursor-pointer"
            @click="setLevel(level === lvl ? null : lvl)"
          >
            {{ t(`courses.levels.${lvl}`) }}
          </Badge>
        </div>
      </div>

      <!-- Min Rating -->
      <div>
        <p class="mb-2 text-sm font-medium text-muted-foreground">{{ t('courses.catalog.minRating') }}</p>
        <div class="flex gap-2">
          <Button
            v-for="opt in ratingOptions"
            :key="opt.value"
            :variant="minRating === opt.value ? 'secondary' : 'outline'"
            size="sm"
            class="gap-1"
            @click="setMinRating(minRating === opt.value ? null : opt.value)"
          >
            <Star class="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {{ opt.label }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Active filters indicator -->
    <div
      v-if="hasActiveFilters"
      class="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <Filter class="h-4 w-4" />
      <span>{{ t('courses.catalog.showing', { filtered: filteredCount, total: totalCourses }) }}</span>
      <Button variant="ghost" size="sm" class="h-6 px-2 text-xs" @click="clearFilters">
        {{ t('courses.catalog.clearFilters') }}
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <CourseCardSkeleton v-for="i in 6" :key="i" />
    </div>

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">{{ t('courses.catalog.error.title') }}</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchCourses">
          {{ t('courses.catalog.error.retry') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Empty State -->
    <div
      v-else-if="courses.length === 0"
      class="flex flex-col items-center justify-center py-12 text-center"
    >
      <BookOpen class="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 class="mb-2 text-lg font-semibold">{{ t('courses.catalog.empty.title') }}</h3>
      <p class="mb-4 text-muted-foreground">
        {{
          hasActiveFilters
            ? t('courses.catalog.empty.messageFiltered')
            : t('courses.catalog.empty.messageEmpty')
        }}
      </p>
      <Button v-if="hasActiveFilters" variant="outline" @click="clearFilters">
        {{ t('courses.catalog.clearFilters') }}
      </Button>
    </div>

    <!-- Course Grid -->
    <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <CourseCard v-for="course in courses" :key="course.id" :course="course" />
    </div>
  </div>
</template>

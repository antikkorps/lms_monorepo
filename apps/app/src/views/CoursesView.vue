<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Loader2,
  AlertCircle,
  BookOpen,
  Filter,
  SlidersHorizontal,
} from 'lucide-vue-next';
import CourseCard from '@/components/courses/CourseCard.vue';
import { useCourses, type CourseFilter, type CourseSortBy } from '@/composables/useCourses';

const {
  isLoading,
  error,
  courses,
  filter,
  sortBy,
  searchQuery,
  totalCourses,
  filteredCount,
  freeCourses,
  fetchCourses,
  setFilter,
  setSortBy,
  setSearchQuery,
  clearFilters,
} = useCourses();

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

const filterOptions: { value: CourseFilter; label: string }[] = [
  { value: 'all', label: 'All Courses' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
];

const sortOptions: { value: CourseSortBy; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'duration', label: 'Longest' },
];

onMounted(() => {
  fetchCourses();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Course Catalog</h1>
      <p class="text-muted-foreground">
        Explore our collection of {{ totalCourses }} courses
        <span v-if="freeCourses > 0">({{ freeCourses }} free)</span>
      </p>
    </div>

    <!-- Search and Filters -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <!-- Search -->
      <div class="relative w-full sm:max-w-sm">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search courses..."
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
      </div>
    </div>

    <!-- Active filters indicator -->
    <div
      v-if="filter !== 'all' || searchQuery"
      class="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <Filter class="h-4 w-4" />
      <span>Showing {{ filteredCount }} of {{ totalCourses }} courses</span>
      <Button variant="ghost" size="sm" class="h-6 px-2 text-xs" @click="clearFilters">
        Clear filters
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">Failed to load courses</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchCourses">Retry</Button>
      </CardContent>
    </Card>

    <!-- Empty State -->
    <div
      v-else-if="courses.length === 0"
      class="flex flex-col items-center justify-center py-12 text-center"
    >
      <BookOpen class="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 class="mb-2 text-lg font-semibold">No courses found</h3>
      <p class="mb-4 text-muted-foreground">
        {{
          searchQuery || filter !== 'all'
            ? 'Try adjusting your filters or search query.'
            : 'Check back later for new courses.'
        }}
      </p>
      <Button v-if="searchQuery || filter !== 'all'" variant="outline" @click="clearFilters">
        Clear filters
      </Button>
    </div>

    <!-- Course Grid -->
    <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <CourseCard v-for="course in courses" :key="course.id" :course="course" />
    </div>
  </div>
</template>

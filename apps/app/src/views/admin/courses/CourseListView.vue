<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { InstructorCourse, CourseStatus } from '@shared/types';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CourseStatusBadge } from '@/components/admin';
import { CourseListSkeleton } from '@/components/skeletons';
import { useCourseEditor } from '@/composables/useCourseEditor';
import {
  Search,
  Plus,
  AlertCircle,
  BookOpen,
  MoreHorizontal,
  Pencil,
  Layers,
  Trash2,
  Send,
  Archive,
  XCircle,
} from 'lucide-vue-next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n();

const {
  isLoading,
  isSaving,
  error,
  courses,
  hasCourses,
  fetchMyCourses,
  deleteCourse,
  publishCourse,
  archiveCourse,
} = useCourseEditor();

// Local state
const searchQuery = ref('');
const statusFilter = ref<CourseStatus | 'all'>('all');
const courseToDelete = ref<InstructorCourse | null>(null);
const isDeleteDialogOpen = ref(false);

// Filtered courses
const filteredCourses = computed(() => {
  let result = [...courses.value];

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (course) =>
        course.title.toLowerCase().includes(query) ||
        course.slug.toLowerCase().includes(query)
    );
  }

  // Apply status filter
  if (statusFilter.value !== 'all') {
    result = result.filter((course) => course.status === statusFilter.value);
  }

  return result;
});

const hasFilteredCourses = computed(() => filteredCourses.value.length > 0);

function clearFilters(): void {
  searchQuery.value = '';
  statusFilter.value = 'all';
}

function handleCreateCourse(): void {
  router.push({ name: 'instructor-course-create' });
}

function handleEditCourse(course: InstructorCourse): void {
  router.push({ name: 'instructor-course-edit', params: { id: course.id } });
}

function handleBuildCourse(course: InstructorCourse): void {
  router.push({ name: 'instructor-course-build', params: { id: course.id } });
}

function confirmDeleteCourse(course: InstructorCourse): void {
  courseToDelete.value = course;
  isDeleteDialogOpen.value = true;
}

async function handleDeleteCourse(): Promise<void> {
  if (!courseToDelete.value) return;

  const success = await deleteCourse(courseToDelete.value.id);
  if (success) {
    toast.success(t('instructor.courses.deleteSuccess', 'Course deleted successfully'));
  } else {
    toast.error(t('instructor.courses.deleteError', 'Failed to delete course'));
  }
  isDeleteDialogOpen.value = false;
  courseToDelete.value = null;
}

async function handlePublishCourse(course: InstructorCourse): Promise<void> {
  const success = await publishCourse(course.id);
  if (success) {
    toast.success(t('instructor.courses.publishSuccess', 'Course published successfully'));
  } else {
    toast.error(t('instructor.courses.publishError', 'Failed to publish course'));
  }
}

async function handleArchiveCourse(course: InstructorCourse): Promise<void> {
  const success = await archiveCourse(course.id);
  if (success) {
    toast.success(t('instructor.courses.archiveSuccess', 'Course archived successfully'));
  } else {
    toast.error(t('instructor.courses.archiveError', 'Failed to archive course'));
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatPrice(price: number): string {
  if (price === 0) return t('instructor.courses.free', 'Free');
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR',
  }).format(price / 100);
}

onMounted(() => {
  console.log('[CourseListView] Component mounted, calling fetchMyCourses...');
  fetchMyCourses();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          {{ t('instructor.courses.title', 'My Courses') }}
        </h1>
        <p class="text-muted-foreground">
          {{ t('instructor.courses.subtitle', 'Create and manage your courses') }}
        </p>
      </div>
      <Button @click="handleCreateCourse">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('instructor.courses.create', 'New Course') }}
      </Button>
    </div>

    <!-- Loading State -->
    <CourseListSkeleton v-if="isLoading" />

    <!-- Error State -->
    <Card v-else-if="error" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">{{ t('instructor.courses.loadError', 'Failed to load courses') }}</p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="fetchMyCourses">
          {{ t('common.retry', 'Retry') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Content -->
    <template v-else>
      <!-- Filters -->
      <Card>
        <CardContent class="pt-6">
          <div class="flex flex-wrap items-center gap-4">
            <!-- Search -->
            <div class="relative flex-1 min-w-[200px] max-w-sm">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                v-model="searchQuery"
                :placeholder="t('instructor.courses.searchPlaceholder', 'Search courses...')"
                class="pl-10"
              />
            </div>

            <!-- Status filter -->
            <Select v-model="statusFilter" class="w-40">
              <option value="all">{{ t('instructor.courses.allStatus', 'All Status') }}</option>
              <option value="draft">{{ t('instructor.courseStatus.draft', 'Draft') }}</option>
              <option value="published">{{ t('instructor.courseStatus.published', 'Published') }}</option>
              <option value="archived">{{ t('instructor.courseStatus.archived', 'Archived') }}</option>
            </Select>

            <!-- Clear filters -->
            <Button
              v-if="searchQuery || statusFilter !== 'all'"
              variant="ghost"
              size="sm"
              @click="clearFilters"
            >
              <XCircle class="mr-2 h-4 w-4" />
              {{ t('common.clear', 'Clear') }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Empty State -->
      <Card v-if="!hasCourses">
        <CardContent class="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen class="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 class="mb-2 text-lg font-semibold">
            {{ t('instructor.courses.noCourses', 'No courses yet') }}
          </h3>
          <p class="mb-4 text-muted-foreground">
            {{ t('instructor.courses.noCoursesDescription', 'Create your first course to get started.') }}
          </p>
          <Button @click="handleCreateCourse">
            <Plus class="mr-2 h-4 w-4" />
            {{ t('instructor.courses.create', 'New Course') }}
          </Button>
        </CardContent>
      </Card>

      <!-- No Results State -->
      <Card v-else-if="!hasFilteredCourses">
        <CardContent class="flex flex-col items-center justify-center py-12 text-center">
          <Search class="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 class="mb-2 text-lg font-semibold">
            {{ t('instructor.courses.noResults', 'No courses found') }}
          </h3>
          <p class="mb-4 text-muted-foreground">
            {{ t('instructor.courses.noResultsDescription', 'Try adjusting your search or filter criteria.') }}
          </p>
          <Button variant="outline" @click="clearFilters">
            {{ t('common.clearFilters', 'Clear Filters') }}
          </Button>
        </CardContent>
      </Card>

      <!-- Courses Table -->
      <Card v-else>
        <CardContent class="p-0">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b bg-muted/50">
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    {{ t('instructor.courses.table.title', 'Course') }}
                  </th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    {{ t('instructor.courses.table.status', 'Status') }}
                  </th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    {{ t('instructor.courses.table.content', 'Content') }}
                  </th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    {{ t('instructor.courses.table.price', 'Price') }}
                  </th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    {{ t('instructor.courses.table.enrollments', 'Enrollments') }}
                  </th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    {{ t('instructor.courses.table.updated', 'Updated') }}
                  </th>
                  <th class="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                    {{ t('instructor.courses.table.actions', 'Actions') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="course in filteredCourses"
                  :key="course.id"
                  class="border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div
                        class="h-10 w-16 rounded bg-muted flex items-center justify-center overflow-hidden"
                      >
                        <img
                          v-if="course.thumbnailUrl"
                          :src="course.thumbnailUrl"
                          :alt="course.title"
                          class="h-full w-full object-cover"
                        />
                        <BookOpen v-else class="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p class="font-medium">{{ course.title }}</p>
                        <p class="text-sm text-muted-foreground">{{ course.slug }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <CourseStatusBadge :status="course.status" />
                  </td>
                  <td class="px-6 py-4 text-sm text-muted-foreground">
                    {{ course.chaptersCount }} {{ t('instructor.courses.chapters', 'chapters') }},
                    {{ course.lessonsCount }} {{ t('instructor.courses.lessons', 'lessons') }}
                  </td>
                  <td class="px-6 py-4 text-sm">
                    {{ formatPrice(course.price) }}
                  </td>
                  <td class="px-6 py-4 text-sm text-muted-foreground">
                    {{ course.enrollmentsCount }}
                  </td>
                  <td class="px-6 py-4 text-sm text-muted-foreground">
                    {{ formatDate(course.updatedAt) }}
                  </td>
                  <td class="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal class="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem @click="handleEditCourse(course)">
                          <Pencil class="mr-2 h-4 w-4" />
                          {{ t('instructor.courses.actions.edit', 'Edit Details') }}
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="handleBuildCourse(course)">
                          <Layers class="mr-2 h-4 w-4" />
                          {{ t('instructor.courses.actions.build', 'Build Content') }}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          v-if="course.status === 'draft'"
                          @click="handlePublishCourse(course)"
                          :disabled="isSaving"
                        >
                          <Send class="mr-2 h-4 w-4" />
                          {{ t('instructor.courses.actions.publish', 'Publish') }}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          v-if="course.status === 'published'"
                          @click="handleArchiveCourse(course)"
                          :disabled="isSaving"
                        >
                          <Archive class="mr-2 h-4 w-4" />
                          {{ t('instructor.courses.actions.archive', 'Archive') }}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          class="text-destructive focus:text-destructive"
                          @click="confirmDeleteCourse(course)"
                        >
                          <Trash2 class="mr-2 h-4 w-4" />
                          {{ t('instructor.courses.actions.delete', 'Delete') }}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </template>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog v-model:open="isDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{ t('instructor.courses.deleteDialog.title', 'Delete Course') }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('instructor.courses.deleteDialog.description', 'Are you sure you want to delete this course? This action cannot be undone.') }}
            <span v-if="courseToDelete" class="block mt-2 font-medium text-foreground">
              "{{ courseToDelete.title }}"
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {{ t('common.cancel', 'Cancel') }}
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="handleDeleteCourse"
            :disabled="isSaving"
          >
            {{ t('common.delete', 'Delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

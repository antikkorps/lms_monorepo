<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { usePaths } from '../composables/usePaths';
import { useAuthStore } from '../stores/auth';
import { BookOpen, Clock, Lock, CheckCircle2, Play } from 'lucide-vue-next';

const route = useRoute();
const { t } = useI18n();
const authStore = useAuthStore();
const { currentPath, pathProgress, isLoading, fetchPath, fetchPathProgress } = usePaths();

const slug = computed(() => route.params.slug as string);

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getCourseProgress(courseId: string): number {
  if (!pathProgress.value) return 0;
  const cp = pathProgress.value.courses.find(c => c.courseId === courseId);
  return cp?.progress || 0;
}

function isCourseCompleted(courseId: string): boolean {
  if (!pathProgress.value) return false;
  const cp = pathProgress.value.courses.find(c => c.courseId === courseId);
  return cp?.completed || false;
}

onMounted(async () => {
  const path = await fetchPath(slug.value);
  if (path && authStore.isAuthenticated) {
    fetchPathProgress(path.id);
  }
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div v-if="isLoading" class="animate-pulse">
      <div class="h-8 bg-muted rounded w-1/2 mb-3" />
      <div class="h-4 bg-muted rounded w-3/4 mb-8" />
      <div v-for="i in 4" :key="i" class="h-20 bg-muted rounded-xl mb-4" />
    </div>

    <template v-else-if="currentPath">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-foreground">{{ currentPath.title }}</h1>
        <p v-if="currentPath.description" class="text-muted-foreground mt-2">
          {{ currentPath.description }}
        </p>
        <div class="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <span class="flex items-center gap-1">
            <BookOpen class="w-4 h-4" />
            {{ t('paths.catalog.courses', { count: currentPath.coursesCount }) }}
          </span>
          <span v-if="currentPath.estimatedDuration > 0" class="flex items-center gap-1">
            <Clock class="w-4 h-4" />
            {{ formatDuration(currentPath.estimatedDuration) }}
          </span>
        </div>
      </div>

      <!-- Progress bar -->
      <div v-if="pathProgress" class="mb-8 bg-card border border-border rounded-xl p-6">
        <h2 class="text-lg font-semibold text-foreground mb-2">{{ t('paths.detail.progress') }}</h2>
        <div class="w-full bg-muted rounded-full h-3 mb-2">
          <div
            class="bg-primary h-3 rounded-full transition-all duration-500"
            :style="{ width: `${pathProgress.overallProgress}%` }"
          />
        </div>
        <p class="text-sm text-muted-foreground">
          {{ t('paths.detail.completedCourses', { completed: pathProgress.completedCourses, total: pathProgress.totalCourses }) }}
        </p>
      </div>

      <!-- Course list -->
      <div>
        <h2 class="text-lg font-semibold text-foreground mb-4">{{ t('paths.detail.coursesInPath') }}</h2>

        <div class="space-y-4">
          <div
            v-for="(item, index) in currentPath.items"
            :key="item.courseId"
            class="bg-card border border-border rounded-xl p-5 flex items-center gap-4"
          >
            <!-- Step number -->
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
              :class="isCourseCompleted(item.courseId)
                ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400'
                : 'bg-muted text-muted-foreground'"
            >
              <CheckCircle2 v-if="isCourseCompleted(item.courseId)" class="w-5 h-5" />
              <span v-else>{{ index + 1 }}</span>
            </div>

            <!-- Course info -->
            <div class="flex-1 min-w-0">
              <router-link
                :to="`/courses/${item.course.slug}`"
                class="font-medium text-foreground hover:text-primary transition-colors"
              >
                {{ item.course.title }}
              </router-link>
              <div class="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span v-if="item.course.lessonsCount">{{ item.course.lessonsCount }} lessons</span>
                <span v-if="item.course.duration > 0">{{ formatDuration(item.course.duration) }}</span>
              </div>
              <!-- Progress bar for individual course -->
              <div v-if="pathProgress && getCourseProgress(item.courseId) > 0" class="mt-2">
                <div class="w-full bg-muted rounded-full h-1.5">
                  <div
                    class="bg-primary h-1.5 rounded-full transition-all"
                    :style="{ width: `${getCourseProgress(item.courseId)}%` }"
                  />
                </div>
              </div>
            </div>

            <!-- Action -->
            <div class="shrink-0">
              <span
                v-if="isCourseCompleted(item.courseId)"
                class="text-sm text-green-600 font-medium"
              >
                {{ t('paths.detail.completed') }}
              </span>
              <router-link
                v-else
                :to="`/courses/${item.course.slug}`"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Play class="w-3.5 h-3.5" />
                {{ getCourseProgress(item.courseId) > 0 ? t('paths.detail.continueCourse') : t('paths.detail.startCourse') }}
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

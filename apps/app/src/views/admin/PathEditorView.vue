<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { usePathEditor } from '../../composables/usePathEditor';
import { usePaths } from '../../composables/usePaths';
import { Plus, Trash2, GripVertical, Save, Loader2 } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { isSaving, createPath, updatePath, deletePath, addCourseToPath, removeCourseFromPath, reorderCourses } = usePathEditor();
const { currentPath, fetchPath } = usePaths();

const isEditing = computed(() => !!route.params.id);
const pathId = computed(() => route.params.id as string);

const form = ref({
  title: '',
  description: '',
  thumbnailUrl: '',
});

const newCourseId = ref('');

async function handleSave() {
  if (isEditing.value) {
    await updatePath(pathId.value, form.value);
  } else {
    const result = await createPath(form.value);
    router.push(`/admin/paths/${result.id}/edit`);
  }
}

async function handleDelete() {
  if (!confirm(t('paths.editor.deleteConfirm'))) return;
  await deletePath(pathId.value);
  router.push('/admin/paths');
}

async function handleAddCourse() {
  if (!newCourseId.value || !pathId.value) return;
  await addCourseToPath(pathId.value, newCourseId.value);
  newCourseId.value = '';
  await fetchPath(pathId.value);
}

async function handleRemoveCourse(courseId: string) {
  await removeCourseFromPath(pathId.value, courseId);
  await fetchPath(pathId.value);
}

onMounted(async () => {
  if (isEditing.value) {
    const path = await fetchPath(pathId.value);
    if (path) {
      form.value = {
        title: path.title,
        description: path.description || '',
        thumbnailUrl: path.thumbnailUrl || '',
      };
    }
  }
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold text-foreground mb-8">
      {{ isEditing ? t('paths.editor.editTitle') : t('paths.editor.createTitle') }}
    </h1>

    <div class="bg-card border border-border rounded-xl p-6 mb-8">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-1">{{ t('paths.editor.titleLabel') }}</label>
          <input
            v-model="form.title"
            type="text"
            class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            :placeholder="t('paths.editor.titlePlaceholder')"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-foreground mb-1">{{ t('paths.editor.descriptionLabel') }}</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            :placeholder="t('paths.editor.descriptionPlaceholder')"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-foreground mb-1">{{ t('paths.editor.thumbnailLabel') }}</label>
          <input
            v-model="form.thumbnailUrl"
            type="url"
            class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="https://..."
          />
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          :disabled="isSaving || !form.title"
          @click="handleSave"
        >
          <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
          <Save v-else class="w-4 h-4" />
          {{ t('paths.editor.save') }}
        </button>

        <button
          v-if="isEditing"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/10 transition-colors"
          @click="handleDelete"
        >
          <Trash2 class="w-4 h-4" />
          {{ t('paths.editor.delete') }}
        </button>
      </div>
    </div>

    <!-- Course list (only when editing) -->
    <div v-if="isEditing && currentPath" class="bg-card border border-border rounded-xl p-6">
      <h2 class="text-lg font-semibold text-foreground mb-4">{{ t('paths.editor.courses') }}</h2>

      <div v-if="currentPath.items && currentPath.items.length > 0" class="space-y-3 mb-4">
        <div
          v-for="item in currentPath.items"
          :key="item.courseId"
          class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
        >
          <GripVertical class="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-foreground truncate">{{ item.course.title }}</p>
            <p class="text-xs text-muted-foreground">{{ item.course.lessonsCount }} lessons</p>
          </div>
          <button
            class="text-sm text-destructive hover:underline shrink-0"
            @click="handleRemoveCourse(item.courseId)"
          >
            {{ t('paths.editor.removeCourse') }}
          </button>
        </div>
      </div>

      <div v-else class="text-center py-8 text-muted-foreground text-sm">
        {{ t('paths.editor.noCourses') }}
      </div>

      <div class="flex gap-2 mt-4">
        <input
          v-model="newCourseId"
          type="text"
          class="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Course ID"
        />
        <button
          class="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          :disabled="!newCourseId"
          @click="handleAddCourse"
        >
          <Plus class="w-4 h-4" />
          {{ t('paths.editor.addCourse') }}
        </button>
      </div>
    </div>
  </div>
</template>

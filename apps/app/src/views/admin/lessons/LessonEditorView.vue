<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Lesson, UpdateLessonInput } from '@shared/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LessonTranslationEditor, LessonTypeSelector, QuizBuilder } from '@/components/admin';
import { useApi } from '@/composables/useApi';
import { usePreview } from '@/composables/usePreview';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Video,
  FileQuestion,
  FileText,
  ClipboardList,
  Settings,
  Languages,
  HelpCircle,
  Eye,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const router = useRouter();
const api = useApi();
const { t } = useI18n();
const { openLessonPreview } = usePreview();

const lessonId = computed(() => route.params.id as string);

// State
const isLoading = ref(false);
const isSaving = ref(false);
const error = ref<string | null>(null);
const lesson = ref<Lesson | null>(null);
const courseSlug = ref<string | null>(null);

// Form state
const form = ref<UpdateLessonInput>({
  title: '',
  type: 'video',
  duration: 0,
  isFree: false,
});

// Active tab
const activeTab = ref('settings');

const typeIcon = computed(() => {
  switch (lesson.value?.type) {
    case 'video':
      return Video;
    case 'quiz':
      return FileQuestion;
    case 'document':
      return FileText;
    case 'assignment':
      return ClipboardList;
    default:
      return FileText;
  }
});

const typeLabel = computed(() => {
  switch (lesson.value?.type) {
    case 'video':
      return t('instructor.lessonTypes.video', 'Video');
    case 'quiz':
      return t('instructor.lessonTypes.quiz', 'Quiz');
    case 'document':
      return t('instructor.lessonTypes.document', 'Document');
    case 'assignment':
      return t('instructor.lessonTypes.assignment', 'Assignment');
    default:
      return lesson.value?.type || '';
  }
});

async function fetchLesson(): Promise<void> {
  isLoading.value = true;
  error.value = null;

  try {
    // Fetch lesson with chapter and course info for preview
    const data = await api.get<Lesson & { chapter?: { course?: { slug: string } } }>(`/lessons/${lessonId.value}`);
    lesson.value = data;
    form.value = {
      title: data.title,
      type: data.type,
      duration: data.duration,
      isFree: data.isFree,
    };

    // Extract course slug if available for preview functionality
    if (data.chapter?.course?.slug) {
      courseSlug.value = data.chapter.course.slug;
    }
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'Failed to load lesson';
  } finally {
    isLoading.value = false;
  }
}

async function handleSave(): Promise<void> {
  isSaving.value = true;
  error.value = null;

  try {
    const data = await api.patch<Lesson>(`/lessons/${lessonId.value}`, form.value);
    lesson.value = data;
    toast.success(t('instructor.lessonEditor.saveSuccess', 'Lesson saved successfully'));
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'Failed to save lesson';
    toast.error(t('instructor.lessonEditor.saveError', 'Failed to save lesson'));
  } finally {
    isSaving.value = false;
  }
}

function handleGoBack(): void {
  router.back();
}

function handlePreviewLesson(): void {
  if (courseSlug.value && lessonId.value) {
    openLessonPreview(courseSlug.value, lessonId.value);
  }
}

function handleContentSaved(): void {
  toast.success(t('instructor.lessonEditor.contentSaved', 'Content saved'));
}

onMounted(() => {
  fetchLesson();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="handleGoBack">
        <ArrowLeft class="h-5 w-5" />
      </Button>
      <div class="flex-1">
        <div class="flex items-center gap-3">
          <h1 class="text-3xl font-bold tracking-tight">
            {{ lesson?.title || t('instructor.lessonEditor.title', 'Lesson Editor') }}
          </h1>
          <Badge v-if="lesson" variant="outline" class="flex items-center gap-1">
            <component :is="typeIcon" class="h-3 w-3" />
            {{ typeLabel }}
          </Badge>
        </div>
        <p class="text-muted-foreground">
          {{ t('instructor.lessonEditor.subtitle', 'Edit lesson settings and content') }}
        </p>
      </div>
      <Button variant="outline" @click="handlePreviewLesson" :disabled="!courseSlug">
        <Eye class="mr-2 h-4 w-4" />
        {{ t('instructor.lessonEditor.preview', 'Preview') }}
      </Button>
    </div>

    <!-- Loading State -->
    <Card v-if="isLoading" class="animate-pulse">
      <CardContent class="py-12 flex items-center justify-center">
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>

    <!-- Error State -->
    <Card v-else-if="error && !lesson" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">
            {{ t('instructor.lessonEditor.loadError', 'Failed to load lesson') }}
          </p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="handleGoBack">
          {{ t('common.goBack', 'Go Back') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Content -->
    <template v-else-if="lesson">
      <Tabs v-model="activeTab" class="space-y-6">
        <TabsList>
          <TabsTrigger value="settings" class="flex items-center gap-2">
            <Settings class="h-4 w-4" />
            {{ t('instructor.lessonEditor.tabs.settings', 'Settings') }}
          </TabsTrigger>
          <TabsTrigger value="content" class="flex items-center gap-2">
            <Languages class="h-4 w-4" />
            {{ t('instructor.lessonEditor.tabs.content', 'Content') }}
          </TabsTrigger>
          <TabsTrigger
            v-if="lesson.type === 'quiz'"
            value="quiz"
            class="flex items-center gap-2"
          >
            <HelpCircle class="h-4 w-4" />
            {{ t('instructor.lessonEditor.tabs.quiz', 'Quiz') }}
          </TabsTrigger>
        </TabsList>

        <!-- Settings Tab -->
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>{{ t('instructor.lessonEditor.settings.title', 'Lesson Settings') }}</CardTitle>
              <CardDescription>
                {{ t('instructor.lessonEditor.settings.description', 'Configure the basic settings for this lesson') }}
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <!-- Title -->
              <div class="space-y-2">
                <Label for="lesson-title">
                  {{ t('instructor.lessonEditor.settings.titleLabel', 'Title') }}
                  <span class="text-destructive">*</span>
                </Label>
                <Input
                  id="lesson-title"
                  v-model="form.title"
                  :placeholder="t('instructor.lessonEditor.settings.titlePlaceholder', 'Enter lesson title')"
                />
              </div>

              <!-- Type -->
              <div class="space-y-2">
                <Label>{{ t('instructor.lessonEditor.settings.type', 'Lesson Type') }}</Label>
                <LessonTypeSelector v-model="form.type" />
              </div>

              <!-- Duration -->
              <div class="space-y-2">
                <Label for="lesson-duration">
                  {{ t('instructor.lessonEditor.settings.duration', 'Duration (minutes)') }}
                </Label>
                <Input
                  id="lesson-duration"
                  v-model.number="form.duration"
                  type="number"
                  min="0"
                  class="max-w-xs"
                />
              </div>

              <!-- Is Free -->
              <div class="flex items-center justify-between max-w-md">
                <div class="space-y-0.5">
                  <Label for="lesson-free">
                    {{ t('instructor.lessonEditor.settings.isFree', 'Free Preview') }}
                  </Label>
                  <p class="text-sm text-muted-foreground">
                    {{ t('instructor.lessonEditor.settings.isFreeDescription', 'Allow non-enrolled users to view this lesson') }}
                  </p>
                </div>
                <Switch id="lesson-free" v-model:checked="form.isFree" />
              </div>

              <!-- Save Button -->
              <div class="pt-4 border-t">
                <Button :disabled="isSaving" @click="handleSave">
                  <Loader2 v-if="isSaving" class="mr-2 h-4 w-4 animate-spin" />
                  <Save v-else class="mr-2 h-4 w-4" />
                  {{ t('common.save', 'Save') }}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Content Tab -->
        <TabsContent value="content">
          <LessonTranslationEditor
            :lesson-id="lessonId"
            :lesson-title="lesson.title"
            :lesson-type="lesson.type"
            @saved="handleContentSaved"
          />
        </TabsContent>

        <!-- Quiz Tab (for quiz lessons) -->
        <TabsContent v-if="lesson.type === 'quiz'" value="quiz">
          <Card>
            <CardHeader>
              <CardTitle>{{ t('instructor.lessonEditor.quiz.title', 'Quiz Builder') }}</CardTitle>
              <CardDescription>
                {{ t('instructor.lessonEditor.quiz.description', 'Create and manage quiz questions') }}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuizBuilder :lesson-id="lessonId" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </template>
  </div>
</template>

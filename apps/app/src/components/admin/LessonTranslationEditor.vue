<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadZone } from '@/components/upload';
import {
  Loader2,
  Save,
  Trash2,
  Globe,
  CheckCircle2,
  AlertCircle,
  Upload,
  Link,
} from 'lucide-vue-next';
import { useLessonContent, type UpsertLessonContentInput } from '@/composables/useLessonContent';
import type { SupportedLocale, LessonType } from '@shared/types';
import type { UploadResult } from '@/composables/useUpload';
import { RefreshCw, Clock, Zap } from 'lucide-vue-next';

const props = defineProps<{
  lessonId: string;
  lessonTitle: string;
  lessonType?: LessonType;
}>();

const emit = defineEmits<{
  (e: 'saved'): void;
}>();

const { t } = useI18n();

const {
  isLoading,
  isSaving,
  error,
  contents,
  supportedLocales,
  getContentByLocale,
  fetchContents,
  upsertContent,
  deleteContent,
  startTranscodingPolling,
  stopTranscodingPolling,
  retryTranscoding,
} = useLessonContent(props.lessonId);

const activeLocale = ref<SupportedLocale>('en');
const saveSuccess = ref(false);
const videoSourceMode = ref<'upload' | 'url'>('url');

// Check if lesson type supports video/document upload
const showVideoUpload = computed(() => props.lessonType === 'video');
const showDocumentUpload = computed(() => props.lessonType === 'document');

// Form state for current locale
const formData = ref<UpsertLessonContentInput>({
  lang: 'en',
  title: null,
  videoUrl: null,
  videoId: null,
  videoSourceKey: null,
  transcript: null,
  description: null,
});

const isRetrying = ref(false);

const currentContent = computed(() => getContentByLocale(activeLocale.value));
const transcodingStatus = computed(() => currentContent.value?.transcodingStatus ?? null);
const transcodingError = computed(() => currentContent.value?.transcodingError ?? null);
const isTranscoding = computed(() =>
  transcodingStatus.value === 'pending' || transcodingStatus.value === 'processing'
);

const localeLabels: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'Français',
};

const hasContentForLocale = computed(() => {
  return !!getContentByLocale(activeLocale.value);
});

function loadLocaleData(locale: SupportedLocale) {
  activeLocale.value = locale;
  const content = getContentByLocale(locale);

  formData.value = {
    lang: locale,
    title: content?.title ?? null,
    videoUrl: content?.videoUrl ?? null,
    videoId: content?.videoId ?? null,
    videoSourceKey: content?.videoSourceKey ?? null,
    transcript: content?.transcript ?? null,
    description: content?.description ?? null,
  };

  // Auto-start polling if transcoding is in progress
  stopTranscodingPolling();
  if (content?.transcodingStatus === 'pending' || content?.transcodingStatus === 'processing') {
    startTranscodingPolling(locale);
  }
}

watch(activeLocale, (locale) => {
  loadLocaleData(locale);
});

async function handleSave() {
  saveSuccess.value = false;
  const result = await upsertContent(formData.value);
  if (result) {
    saveSuccess.value = true;
    emit('saved');
    // Start polling if transcoding is pending
    if (result.transcodingStatus === 'pending' || result.transcodingStatus === 'processing') {
      startTranscodingPolling(activeLocale.value);
    }
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  }
}

async function handleRetryTranscoding() {
  isRetrying.value = true;
  const success = await retryTranscoding(activeLocale.value);
  if (success) {
    startTranscodingPolling(activeLocale.value);
  }
  isRetrying.value = false;
}

async function handleDelete() {
  if (!confirm(t('admin.lessonContent.confirmDelete'))) {
    return;
  }

  const success = await deleteContent(activeLocale.value);
  if (success) {
    stopTranscodingPolling();
    formData.value = {
      lang: activeLocale.value,
      title: null,
      videoUrl: null,
      videoId: null,
      videoSourceKey: null,
      transcript: null,
      description: null,
    };
  }
}

function handleVideoUpload(result: UploadResult) {
  formData.value.videoUrl = result.url;
  formData.value.videoId = result.key;
  formData.value.videoSourceKey = result.key;
}

function handleDocumentUpload(result: UploadResult) {
  // For documents, we store the URL in videoUrl field (reusing existing field)
  formData.value.videoUrl = result.url;
  formData.value.videoId = result.key;
}

onMounted(async () => {
  await fetchContents();
  loadLocaleData(activeLocale.value);
});
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Globe class="h-5 w-5 text-muted-foreground" />
          <CardTitle class="text-lg">{{ t('admin.lessonContent.title') }}</CardTitle>
        </div>
        <div class="text-sm text-muted-foreground">
          {{ lessonTitle }}
        </div>
      </div>
    </CardHeader>
    <CardContent class="space-y-6">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex items-center gap-2 text-destructive">
        <AlertCircle class="h-5 w-5" />
        <span>{{ error }}</span>
      </div>

      <!-- Content -->
      <template v-else>
        <!-- Locale Tabs -->
        <div class="flex border-b">
          <button
            v-for="locale in supportedLocales"
            :key="locale"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors relative"
            :class="activeLocale === locale
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'"
            @click="loadLocaleData(locale)"
          >
            {{ localeLabels[locale] }}
            <span
              v-if="getContentByLocale(locale)"
              class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
            />
          </button>
        </div>

        <!-- Form -->
        <div class="space-y-4">
          <!-- Title -->
          <div class="space-y-2">
            <Label for="title">{{ t('admin.lessonContent.fields.title') }}</Label>
            <Input
              id="title"
              v-model="formData.title"
              :placeholder="t('admin.lessonContent.placeholders.title')"
            />
            <p class="text-xs text-muted-foreground">
              {{ t('admin.lessonContent.hints.title') }}
            </p>
          </div>

          <!-- Video/Document Upload Section -->
          <div v-if="showVideoUpload || showDocumentUpload" class="space-y-3">
            <Label>
              {{ showVideoUpload
                ? t('admin.lessonContent.fields.videoSource', 'Video Source')
                : t('admin.lessonContent.fields.documentSource', 'Document Source')
              }}
            </Label>

            <Tabs v-model="videoSourceMode" class="w-full">
              <TabsList class="grid w-full grid-cols-2">
                <TabsTrigger value="upload" class="flex items-center gap-2">
                  <Upload class="h-4 w-4" />
                  {{ t('admin.lessonContent.uploadFile', 'Upload') }}
                </TabsTrigger>
                <TabsTrigger value="url" class="flex items-center gap-2">
                  <Link class="h-4 w-4" />
                  {{ t('admin.lessonContent.externalUrl', 'External URL') }}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" class="mt-3">
                <UploadZone
                  v-if="showVideoUpload"
                  category="video"
                  :label="t('admin.lessonContent.dropVideo', 'Drop video here')"
                  @upload="handleVideoUpload"
                />
                <UploadZone
                  v-else-if="showDocumentUpload"
                  category="document"
                  :label="t('admin.lessonContent.dropDocument', 'Drop document here')"
                  @upload="handleDocumentUpload"
                />
                <p v-if="formData.videoUrl && videoSourceMode === 'upload'" class="mt-2 text-sm text-muted-foreground">
                  {{ t('admin.lessonContent.currentFile', 'Current file:') }} {{ formData.videoId }}
                </p>
              </TabsContent>

              <TabsContent value="url" class="mt-3 space-y-3">
                <!-- Video/Document URL -->
                <div class="space-y-2">
                  <Label for="videoUrl">
                    {{ showVideoUpload
                      ? t('admin.lessonContent.fields.videoUrl', 'Video URL')
                      : t('admin.lessonContent.fields.documentUrl', 'Document URL')
                    }}
                  </Label>
                  <Input
                    id="videoUrl"
                    v-model="formData.videoUrl"
                    type="url"
                    :placeholder="showVideoUpload
                      ? t('admin.lessonContent.placeholders.videoUrl', 'https://youtube.com/watch?v=... or video URL')
                      : t('admin.lessonContent.placeholders.documentUrl', 'https://example.com/document.pdf')"
                  />
                </div>

                <!-- Video ID (only for videos) -->
                <div v-if="showVideoUpload" class="space-y-2">
                  <Label for="videoId">{{ t('admin.lessonContent.fields.videoId', 'Video ID') }}</Label>
                  <Input
                    id="videoId"
                    v-model="formData.videoId"
                    :placeholder="t('admin.lessonContent.placeholders.videoId', 'YouTube or Cloudflare Stream ID')"
                  />
                  <p class="text-xs text-muted-foreground">
                    {{ t('admin.lessonContent.hints.videoId', 'For YouTube: the video ID from the URL. For Cloudflare Stream: the stream ID.') }}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <!-- Transcoding Status Banner -->
          <div v-if="showVideoUpload && transcodingStatus" class="rounded-lg border p-4">
            <!-- Pending / Processing -->
            <div v-if="isTranscoding" class="flex items-center gap-3 text-blue-600 dark:text-blue-400">
              <Loader2 class="h-5 w-5 animate-spin" />
              <div>
                <p class="font-medium">
                  {{ transcodingStatus === 'pending'
                    ? t('admin.lessonContent.transcoding.pending', 'Transcoding queued...')
                    : t('admin.lessonContent.transcoding.processing', 'Transcoding in progress...')
                  }}
                </p>
                <p class="text-sm text-muted-foreground">
                  {{ t('admin.lessonContent.transcoding.processingHint', 'This may take a few minutes. You can leave this page.') }}
                </p>
              </div>
            </div>

            <!-- Ready -->
            <div v-else-if="transcodingStatus === 'ready'" class="flex items-center gap-3 text-green-600 dark:text-green-400">
              <CheckCircle2 class="h-5 w-5" />
              <div>
                <p class="font-medium">{{ t('admin.lessonContent.transcoding.ready', 'Video transcoded and ready') }}</p>
                <p v-if="currentContent?.videoPlaybackUrl" class="text-sm text-muted-foreground truncate max-w-md">
                  {{ currentContent.videoPlaybackUrl }}
                </p>
              </div>
            </div>

            <!-- Error -->
            <div v-else-if="transcodingStatus === 'error'" class="flex items-center justify-between">
              <div class="flex items-center gap-3 text-destructive">
                <AlertCircle class="h-5 w-5" />
                <div>
                  <p class="font-medium">{{ t('admin.lessonContent.transcoding.error', 'Transcoding failed') }}</p>
                  <p v-if="transcodingError" class="text-sm text-muted-foreground">{{ transcodingError }}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" :disabled="isRetrying" @click="handleRetryTranscoding">
                <RefreshCw v-if="!isRetrying" class="mr-2 h-4 w-4" />
                <Loader2 v-else class="mr-2 h-4 w-4 animate-spin" />
                {{ t('admin.lessonContent.transcoding.retry', 'Retry') }}
              </Button>
            </div>
          </div>

          <!-- Fallback for other lesson types (quiz, assignment) - just URL fields -->
          <template v-else>
            <!-- Video URL -->
            <div class="space-y-2">
              <Label for="videoUrl">{{ t('admin.lessonContent.fields.videoUrl') }}</Label>
              <Input
                id="videoUrl"
                v-model="formData.videoUrl"
                type="url"
                :placeholder="t('admin.lessonContent.placeholders.videoUrl')"
              />
            </div>

            <!-- Video ID -->
            <div class="space-y-2">
              <Label for="videoId">{{ t('admin.lessonContent.fields.videoId') }}</Label>
              <Input
                id="videoId"
                v-model="formData.videoId"
                :placeholder="t('admin.lessonContent.placeholders.videoId')"
              />
            </div>
          </template>

          <!-- Description -->
          <div class="space-y-2">
            <Label for="description">{{ t('admin.lessonContent.fields.description') }}</Label>
            <Textarea
              id="description"
              v-model="formData.description"
              :placeholder="t('admin.lessonContent.placeholders.description')"
              :rows="3"
            />
          </div>

          <!-- Transcript -->
          <div class="space-y-2">
            <Label for="transcript">{{ t('admin.lessonContent.fields.transcript') }}</Label>
            <Textarea
              id="transcript"
              v-model="formData.transcript"
              :placeholder="t('admin.lessonContent.placeholders.transcript')"
              :rows="6"
            />
            <p class="text-xs text-muted-foreground">
              {{ t('admin.lessonContent.hints.transcript') }}
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-4 border-t">
          <div>
            <Button
              v-if="hasContentForLocale"
              variant="destructive"
              size="sm"
              :disabled="isSaving"
              @click="handleDelete"
            >
              <Trash2 class="mr-2 h-4 w-4" />
              {{ t('admin.lessonContent.actions.delete') }}
            </Button>
          </div>

          <div class="flex items-center gap-2">
            <div
              v-if="saveSuccess"
              class="flex items-center gap-1 text-green-600 text-sm"
            >
              <CheckCircle2 class="h-4 w-4" />
              {{ t('admin.lessonContent.saved') }}
            </div>
            <Button :disabled="isSaving" @click="handleSave">
              <Loader2 v-if="isSaving" class="mr-2 h-4 w-4 animate-spin" />
              <Save v-else class="mr-2 h-4 w-4" />
              {{ t('admin.lessonContent.actions.save') }}
            </Button>
          </div>
        </div>
      </template>
    </CardContent>
  </Card>
</template>

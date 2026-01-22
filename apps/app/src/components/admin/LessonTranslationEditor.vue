<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Save,
  Trash2,
  Globe,
  CheckCircle2,
  AlertCircle,
} from 'lucide-vue-next';
import { useLessonContent, type UpsertLessonContentInput } from '@/composables/useLessonContent';
import type { SupportedLocale } from '@shared/types';

const props = defineProps<{
  lessonId: string;
  lessonTitle: string;
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
} = useLessonContent(props.lessonId);

const activeLocale = ref<SupportedLocale>('en');
const saveSuccess = ref(false);

// Form state for current locale
const formData = ref<UpsertLessonContentInput>({
  lang: 'en',
  title: null,
  videoUrl: null,
  videoId: null,
  transcript: null,
  description: null,
});

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
    transcript: content?.transcript ?? null,
    description: content?.description ?? null,
  };
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
    // Clear success message after 3 seconds
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  }
}

async function handleDelete() {
  if (!confirm(t('admin.lessonContent.confirmDelete'))) {
    return;
  }

  const success = await deleteContent(activeLocale.value);
  if (success) {
    // Reset form data
    formData.value = {
      lang: activeLocale.value,
      title: null,
      videoUrl: null,
      videoId: null,
      transcript: null,
      description: null,
    };
  }
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

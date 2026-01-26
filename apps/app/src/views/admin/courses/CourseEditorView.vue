<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { CreateCourseInput, UpdateCourseInput, Currency } from '@shared/types';
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
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useCourseEditor } from '@/composables/useCourseEditor';
import { UploadZone } from '@/components/upload';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';
import type { UploadResult } from '@/composables/useUpload';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const {
  isLoading,
  isSaving,
  error,
  currentCourse,
  fetchCourse,
  createCourse,
  updateCourse,
  clearError,
} = useCourseEditor();

// Mode
const isEditMode = computed(() => !!route.params.id);
const courseId = computed(() => route.params.id as string | undefined);

// Form state
const form = ref<CreateCourseInput & UpdateCourseInput & { currency: Currency }>({
  title: '',
  slug: '',
  description: '',
  price: 0,
  currency: 'EUR',
  thumbnailUrl: '',
});

// Validation errors
const errors = ref<Partial<Record<keyof typeof form.value, string>>>({});

// Auto-generate slug from title
const autoSlug = ref(true);
watch(
  () => form.value.title,
  (newTitle) => {
    if (autoSlug.value && !isEditMode.value) {
      form.value.slug = generateSlug(newTitle);
    }
  }
);

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function handleSlugInput(): void {
  autoSlug.value = false;
}

function validateForm(): boolean {
  errors.value = {};

  if (!form.value.title?.trim()) {
    errors.value.title = t('instructor.courseEditor.errors.titleRequired', 'Title is required');
  }

  // Slug is optional - backend will generate from title if not provided
  const slug = form.value.slug?.trim();
  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    errors.value.slug = t(
      'instructor.courseEditor.errors.slugInvalid',
      'Slug can only contain lowercase letters, numbers, and hyphens'
    );
  }

  if (form.value.price !== undefined && form.value.price < 0) {
    errors.value.price = t('instructor.courseEditor.errors.priceInvalid', 'Price cannot be negative');
  }

  return Object.keys(errors.value).length === 0;
}

async function handleSubmit(): Promise<void> {
  clearError();

  if (!validateForm()) {
    return;
  }

  const input: Record<string, unknown> = {
    title: form.value.title.trim(),
    price: form.value.price || 0, // Price in selected currency
    currency: form.value.currency,
  };

  // Only include optional fields if they have values (backend expects undefined, not null)
  const slug = form.value.slug?.trim();
  if (slug) {
    input.slug = slug;
  }

  const description = form.value.description?.trim();
  if (description) {
    input.description = description;
  }

  const thumbnailUrl = form.value.thumbnailUrl?.trim();
  if (thumbnailUrl) {
    input.thumbnailUrl = thumbnailUrl;
  }

  if (isEditMode.value && courseId.value) {
    const course = await updateCourse(courseId.value, input);
    if (course) {
      toast.success(t('instructor.courseEditor.updateSuccess', 'Course updated successfully'));
      router.push({ name: 'instructor-courses' });
    } else {
      toast.error(error.value || t('instructor.courseEditor.updateError', 'Failed to update course'));
    }
  } else {
    const course = await createCourse(input);
    if (course) {
      toast.success(t('instructor.courseEditor.createSuccess', 'Course created successfully'));
      router.push({ name: 'instructor-course-build', params: { id: course.id } });
    } else {
      toast.error(error.value || t('instructor.courseEditor.createError', 'Failed to create course'));
    }
  }
}

function handleCancel(): void {
  router.push({ name: 'instructor-courses' });
}

function handleThumbnailUpload(result: UploadResult): void {
  form.value.thumbnailUrl = result.url;
}

// Load course data for edit mode
onMounted(async () => {
  if (isEditMode.value && courseId.value) {
    const course = await fetchCourse(courseId.value);
    if (course) {
      form.value = {
        title: course.title,
        slug: course.slug,
        description: course.description || '',
        price: Number(course.price),
        currency: (course.currency as Currency) || 'EUR',
        thumbnailUrl: course.thumbnailUrl || '',
      };
      autoSlug.value = false;
    }
  }
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="handleCancel">
        <ArrowLeft class="h-5 w-5" />
      </Button>
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          {{
            isEditMode
              ? t('instructor.courseEditor.editTitle', 'Edit Course')
              : t('instructor.courseEditor.createTitle', 'Create Course')
          }}
        </h1>
        <p class="text-muted-foreground">
          {{
            isEditMode
              ? t('instructor.courseEditor.editSubtitle', 'Update your course details')
              : t('instructor.courseEditor.createSubtitle', 'Set up your new course')
          }}
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <Card v-if="isLoading" class="animate-pulse">
      <CardContent class="py-12 flex items-center justify-center">
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>

    <!-- Error State -->
    <Card v-else-if="error && isEditMode" class="border-destructive">
      <CardContent class="flex items-center gap-4 py-6">
        <AlertCircle class="h-8 w-8 text-destructive" />
        <div>
          <p class="font-medium">
            {{ t('instructor.courseEditor.loadError', 'Failed to load course') }}
          </p>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="outline" class="ml-auto" @click="handleCancel">
          {{ t('common.goBack', 'Go Back') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Form -->
    <form v-else @submit.prevent="handleSubmit" class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{{ t('instructor.courseEditor.basicInfo', 'Basic Information') }}</CardTitle>
          <CardDescription>
            {{ t('instructor.courseEditor.basicInfoDescription', 'The essential details about your course') }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Title -->
          <div class="space-y-2">
            <Label for="title">
              {{ t('instructor.courseEditor.title', 'Title') }}
              <span class="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              v-model="form.title"
              :placeholder="t('instructor.courseEditor.titlePlaceholder', 'e.g., Introduction to Machine Learning')"
              :class="{ 'border-destructive': errors.title }"
            />
            <p v-if="errors.title" class="text-sm text-destructive">{{ errors.title }}</p>
          </div>

          <!-- Slug -->
          <div class="space-y-2">
            <Label for="slug">
              {{ t('instructor.courseEditor.slug', 'URL Slug') }}
            </Label>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">/courses/</span>
              <Input
                id="slug"
                v-model="form.slug"
                :placeholder="t('instructor.courseEditor.slugPlaceholder', 'intro-machine-learning')"
                :class="{ 'border-destructive': errors.slug }"
                @input="handleSlugInput"
              />
            </div>
            <p v-if="errors.slug" class="text-sm text-destructive">{{ errors.slug }}</p>
            <p v-else class="text-sm text-muted-foreground">
              {{ t('instructor.courseEditor.slugHint', 'Optional. Will be auto-generated from title if not provided. Only lowercase letters, numbers, and hyphens allowed.') }}
            </p>
          </div>

          <!-- Description -->
          <div class="space-y-2">
            <Label for="description">
              {{ t('instructor.courseEditor.description', 'Description') }}
            </Label>
            <Textarea
              id="description"
              v-model="form.description"
              :placeholder="t('instructor.courseEditor.descriptionPlaceholder', 'Describe what students will learn in this course...')"
              :rows="4"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{{ t('instructor.courseEditor.pricing', 'Pricing') }}</CardTitle>
          <CardDescription>
            {{ t('instructor.courseEditor.pricingDescription', 'Set the price for your course. Leave at 0 for a free course.') }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap gap-4">
            <!-- Price -->
            <div class="space-y-2 flex-1 min-w-[200px]">
              <Label for="price">
                {{ t('instructor.courseEditor.price', 'Price') }}
              </Label>
              <Input
                id="price"
                v-model.number="form.price"
                type="number"
                min="0"
                step="0.01"
                :placeholder="t('instructor.courseEditor.pricePlaceholder', '0.00')"
                :class="{ 'border-destructive': errors.price }"
              />
              <p v-if="errors.price" class="text-sm text-destructive">{{ errors.price }}</p>
            </div>

            <!-- Currency -->
            <div class="space-y-2 w-32">
              <Label for="currency">
                {{ t('instructor.courseEditor.currency', 'Currency') }}
              </Label>
              <Select id="currency" v-model="form.currency">
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{{ t('instructor.courseEditor.media', 'Media') }}</CardTitle>
          <CardDescription>
            {{ t('instructor.courseEditor.mediaDescription', 'Add a thumbnail image for your course') }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Thumbnail Upload -->
          <div class="space-y-2">
            <Label>{{ t('instructor.courseEditor.thumbnail', 'Thumbnail Image') }}</Label>
            <UploadZone
              category="image"
              :label="t('instructor.courseEditor.dropThumbnail', 'Drop thumbnail image here')"
              :show-preview="false"
              @upload="handleThumbnailUpload"
            />
            <p class="text-sm text-muted-foreground">
              {{ t('instructor.courseEditor.thumbnailHint', 'Recommended size: 1280x720 pixels') }}
            </p>
          </div>

          <!-- Or enter URL manually -->
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <span class="w-full border-t" />
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-background px-2 text-muted-foreground">
                {{ t('common.or', 'or') }}
              </span>
            </div>
          </div>

          <!-- Thumbnail URL -->
          <div class="space-y-2">
            <Label for="thumbnailUrl">
              {{ t('instructor.courseEditor.thumbnailUrl', 'Thumbnail URL') }}
            </Label>
            <Input
              id="thumbnailUrl"
              v-model="form.thumbnailUrl"
              type="url"
              :placeholder="t('instructor.courseEditor.thumbnailPlaceholder', 'https://example.com/image.jpg')"
            />
          </div>

          <!-- Preview -->
          <div v-if="form.thumbnailUrl" class="space-y-2">
            <Label>{{ t('instructor.courseEditor.preview', 'Preview') }}</Label>
            <div class="w-64 h-36 rounded-lg overflow-hidden bg-muted">
              <img
                :src="form.thumbnailUrl"
                :alt="form.title || 'Thumbnail preview'"
                class="w-full h-full object-cover"
                @error="form.thumbnailUrl = ''"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-4">
        <Button type="button" variant="outline" @click="handleCancel">
          {{ t('common.cancel', 'Cancel') }}
        </Button>
        <Button type="submit" :disabled="isSaving">
          <Loader2 v-if="isSaving" class="mr-2 h-4 w-4 animate-spin" />
          <Save v-else class="mr-2 h-4 w-4" />
          {{
            isEditMode
              ? t('instructor.courseEditor.save', 'Save Changes')
              : t('instructor.courseEditor.create', 'Create Course')
          }}
        </Button>
      </div>
    </form>
  </div>
</template>

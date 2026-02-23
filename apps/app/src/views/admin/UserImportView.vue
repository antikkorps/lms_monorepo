<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserImport } from '../../composables/useUserImport';
import { Upload, FileDown, CheckCircle2, AlertCircle, Loader2 } from 'lucide-vue-next';

const { t } = useI18n();
const {
  rows,
  importStatus,
  isUploading,
  isPolling,
  parseError,
  parseFile,
  startImport,
  startPolling,
  stopPolling,
  reset,
  downloadTemplate,
} = useUserImport();

type Step = 'upload' | 'preview' | 'processing' | 'results';
const step = ref<Step>('upload');
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFileName = ref('');
const importId = ref('');

const progressPercent = computed(() => {
  if (!importStatus.value || importStatus.value.totalRows === 0) return 0;
  const processed = importStatus.value.successCount + importStatus.value.errorCount;
  return Math.round((processed / importStatus.value.totalRows) * 100);
});

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.csv')) {
    parseError.value = 'invalidFile';
    return;
  }

  selectedFileName.value = file.name;
  try {
    await parseFile(file);
    step.value = 'preview';
  } catch {
    // parseError is already set
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  const file = event.dataTransfer?.files[0];
  if (!file) return;

  if (!file.name.endsWith('.csv')) {
    parseError.value = 'invalidFile';
    return;
  }

  selectedFileName.value = file.name;
  parseFile(file)
    .then(() => { step.value = 'preview'; })
    .catch(() => {});
}

async function handleStartImport() {
  try {
    const id = await startImport(selectedFileName.value);
    importId.value = id;
    step.value = 'processing';
    await startPolling(id);
    step.value = 'results';
  } catch {
    step.value = 'results';
  }
}

function handleNewImport() {
  reset();
  step.value = 'upload';
  selectedFileName.value = '';
  importId.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-foreground">{{ t('admin.import.title') }}</h1>
        <p class="text-muted-foreground mt-1">{{ t('admin.import.subtitle') }}</p>
      </div>
      <button
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-accent transition-colors"
        @click="downloadTemplate"
      >
        <FileDown class="w-4 h-4" />
        {{ t('admin.import.downloadTemplate') }}
      </button>
    </div>

    <!-- Step 1: Upload -->
    <div v-if="step === 'upload'" class="bg-card border border-border rounded-xl p-8">
      <div
        class="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
        @click="fileInput?.click()"
        @dragover.prevent
        @drop="handleDrop"
      >
        <Upload class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p class="text-foreground font-medium">{{ t('admin.import.selectFile') }}</p>
        <p class="text-sm text-muted-foreground mt-1">{{ t('admin.import.dragDrop') }}</p>
        <p class="text-xs text-muted-foreground mt-3">{{ t('admin.import.csvFormat') }}</p>
        <p class="text-xs text-muted-foreground">{{ t('admin.import.maxRows') }}</p>
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          class="hidden"
          @change="handleFileSelect"
        />
      </div>

      <div v-if="parseError" class="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
        <AlertCircle class="w-5 h-5 shrink-0" />
        <span v-if="parseError === 'invalidFile'">{{ t('admin.import.validation.invalidFile') }}</span>
        <span v-else-if="parseError === 'empty'">{{ t('admin.import.validation.emptyFile') }}</span>
        <span v-else-if="parseError.startsWith('missing:')">{{ t('admin.import.validation.missingColumns', { columns: parseError.replace('missing:', '') }) }}</span>
        <span v-else-if="parseError === 'tooMany'">{{ t('admin.import.validation.tooManyRows') }}</span>
        <span v-else>{{ parseError }}</span>
      </div>
    </div>

    <!-- Step 2: Preview -->
    <div v-else-if="step === 'preview'" class="bg-card border border-border rounded-xl p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-lg font-semibold text-foreground">{{ t('admin.import.preview') }}</h2>
          <p class="text-sm text-muted-foreground">{{ t('admin.import.rowsDetected', { count: rows.length }) }}</p>
        </div>
      </div>

      <div class="overflow-x-auto border border-border rounded-lg">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-muted">
              <th class="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
              <th class="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th class="px-4 py-3 text-left font-medium text-muted-foreground">First Name</th>
              <th class="px-4 py-3 text-left font-medium text-muted-foreground">Last Name</th>
              <th class="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in rows.slice(0, 20)"
              :key="index"
              class="border-t border-border"
            >
              <td class="px-4 py-2 text-muted-foreground">{{ index + 1 }}</td>
              <td class="px-4 py-2">{{ row.email }}</td>
              <td class="px-4 py-2">{{ row.firstName }}</td>
              <td class="px-4 py-2">{{ row.lastName }}</td>
              <td class="px-4 py-2">
                <span class="px-2 py-0.5 text-xs rounded-full bg-muted">{{ row.role || 'learner' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="rows.length > 20" class="p-3 text-center text-sm text-muted-foreground border-t border-border">
          ... and {{ rows.length - 20 }} more rows
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button
          class="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-accent transition-colors"
          @click="handleNewImport"
        >
          {{ t('admin.import.cancel') }}
        </button>
        <button
          class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          :disabled="isUploading"
          @click="handleStartImport"
        >
          <Loader2 v-if="isUploading" class="w-4 h-4 animate-spin inline mr-2" />
          {{ t('admin.import.startImport') }}
        </button>
      </div>
    </div>

    <!-- Step 3: Processing -->
    <div v-else-if="step === 'processing'" class="bg-card border border-border rounded-xl p-8 text-center">
      <Loader2 class="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
      <h2 class="text-lg font-semibold text-foreground">{{ t('admin.import.processing') }}</h2>
      <p class="text-sm text-muted-foreground mt-1">{{ t('admin.import.processingSubtitle') }}</p>

      <div v-if="importStatus" class="mt-6">
        <div class="w-full bg-muted rounded-full h-3 mb-2">
          <div
            class="bg-primary h-3 rounded-full transition-all duration-500"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <p class="text-sm text-muted-foreground">
          {{ t('admin.import.progress', { success: importStatus.successCount + importStatus.errorCount, total: importStatus.totalRows }) }}
        </p>
      </div>
    </div>

    <!-- Step 4: Results -->
    <div v-else-if="step === 'results' && importStatus" class="bg-card border border-border rounded-xl p-6">
      <div class="text-center mb-6">
        <CheckCircle2 v-if="importStatus.errorCount === 0" class="w-12 h-12 text-green-500 mx-auto mb-4" />
        <AlertCircle v-else class="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-foreground">{{ t('admin.import.results') }}</h2>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-green-600">{{ importStatus.successCount }}</p>
          <p class="text-sm text-green-600">{{ t('admin.import.successCount', { count: importStatus.successCount }) }}</p>
        </div>
        <div class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-red-600">{{ importStatus.errorCount }}</p>
          <p class="text-sm text-red-600">{{ t('admin.import.errorCount', { count: importStatus.errorCount }) }}</p>
        </div>
      </div>

      <div v-if="importStatus.errors.length > 0" class="mb-6">
        <h3 class="text-sm font-semibold text-foreground mb-3">{{ t('admin.import.errors') }}</h3>
        <div class="space-y-2 max-h-60 overflow-y-auto">
          <div
            v-for="error in importStatus.errors"
            :key="error.row"
            class="flex items-start gap-2 p-3 bg-destructive/5 rounded-lg text-sm"
          >
            <AlertCircle class="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <span class="font-medium">{{ t('admin.import.errorRow', { row: error.row }) }}</span>
              <span v-if="error.email" class="text-muted-foreground"> ({{ error.email }})</span>
              <span class="text-muted-foreground"> — {{ error.message }}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        @click="handleNewImport"
      >
        {{ t('admin.import.newImport') }}
      </button>
    </div>
  </div>
</template>

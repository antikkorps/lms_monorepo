import { ref } from 'vue';
import { useApi } from './useApi';

interface CsvRow {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

interface ImportError {
  row: number;
  email?: string;
  message: string;
}

interface ImportStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  fileName: string;
  createdAt: string;
}

const REQUIRED_COLUMNS = ['email', 'firstname', 'lastname'];

export function useUserImport() {
  const api = useApi();
  const rows = ref<CsvRow[]>([]);
  const importStatus = ref<ImportStatus | null>(null);
  const isUploading = ref(false);
  const isPolling = ref(false);
  const parseError = ref<string | null>(null);

  function parseCsv(text: string): CsvRow[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('empty');
    }

    const headerLine = lines[0].toLowerCase().replace(/\r/g, '');
    const headers = headerLine.split(',').map(h => h.trim());

    // Validate required columns
    const missing = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    if (missing.length > 0) {
      throw new Error(`missing:${missing.join(',')}`);
    }

    const emailIdx = headers.indexOf('email');
    const firstNameIdx = headers.indexOf('firstname');
    const lastNameIdx = headers.indexOf('lastname');
    const roleIdx = headers.indexOf('role');

    const parsed: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].replace(/\r/g, '').trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      parsed.push({
        email: values[emailIdx] || '',
        firstName: values[firstNameIdx] || '',
        lastName: values[lastNameIdx] || '',
        role: roleIdx >= 0 ? values[roleIdx] || 'learner' : 'learner',
      });
    }

    if (parsed.length > 500) {
      throw new Error('tooMany');
    }

    return parsed;
  }

  async function parseFile(file: File): Promise<void> {
    parseError.value = null;
    rows.value = [];

    try {
      const text = await file.text();
      rows.value = parseCsv(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid file';
      parseError.value = message;
      throw err;
    }
  }

  async function startImport(fileName: string): Promise<string> {
    isUploading.value = true;
    try {
      const result = await api.post<{ importId: string }>('/admin/import/csv', {
        rows: rows.value,
        fileName,
      });
      return result.importId;
    } finally {
      isUploading.value = false;
    }
  }

  async function pollStatus(importId: string): Promise<ImportStatus> {
    const result = await api.get<ImportStatus>(`/admin/import/${importId}`);
    importStatus.value = result;
    return result;
  }

  async function startPolling(importId: string, interval = 2000): Promise<void> {
    isPolling.value = true;

    const poll = async () => {
      try {
        const status = await pollStatus(importId);
        if (status.status === 'completed' || status.status === 'failed') {
          isPolling.value = false;
          return;
        }
        if (isPolling.value) {
          setTimeout(poll, interval);
        }
      } catch {
        isPolling.value = false;
      }
    };

    await poll();
  }

  function stopPolling() {
    isPolling.value = false;
  }

  function reset() {
    rows.value = [];
    importStatus.value = null;
    isUploading.value = false;
    isPolling.value = false;
    parseError.value = null;
  }

  async function downloadTemplate(): Promise<void> {
    const response = await fetch('/api/v1/admin/import/csv/template');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    rows,
    importStatus,
    isUploading,
    isPolling,
    parseError,
    parseFile,
    startImport,
    pollStatus,
    startPolling,
    stopPolling,
    reset,
    downloadTemplate,
  };
}

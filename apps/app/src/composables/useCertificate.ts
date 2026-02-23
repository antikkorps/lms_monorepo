import { ref } from 'vue';
import { apiClient } from './useApi';

export interface CertificatePreview {
  certificateId: string;
  recipientName: string;
  courseName: string;
  completionDate: string;
  downloadUrl: string;
}

export function useCertificate() {
  const preview = ref<CertificatePreview | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchPreview(courseId: string) {
    isLoading.value = true;
    error.value = null;

    try {
      const data = await apiClient.get<CertificatePreview>(
        `/certificates/${courseId}/preview`
      );
      preview.value = data;
    } catch {
      error.value = 'Failed to load certificate';
      preview.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  function downloadCertificate(courseId: string) {
    // Direct download via authenticated URL
    window.open(`/api/v1/certificates/${courseId}`, '_blank');
  }

  return {
    preview,
    isLoading,
    error,
    fetchPreview,
    downloadCertificate,
  };
}

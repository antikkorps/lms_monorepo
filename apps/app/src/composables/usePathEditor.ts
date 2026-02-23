import { ref } from 'vue';
import { useApi } from './useApi';

interface PathFormData {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  status?: string;
}

export function usePathEditor() {
  const api = useApi();
  const isSaving = ref(false);

  async function createPath(data: PathFormData) {
    isSaving.value = true;
    try {
      return await api.post<{ id: string; slug: string }>('/paths', data);
    } finally {
      isSaving.value = false;
    }
  }

  async function updatePath(id: string, data: Partial<PathFormData>) {
    isSaving.value = true;
    try {
      return await api.patch(`/paths/${id}`, data);
    } finally {
      isSaving.value = false;
    }
  }

  async function deletePath(id: string) {
    await api.delete(`/paths/${id}`);
  }

  async function addCourseToPath(pathId: string, courseId: string, position?: number) {
    await api.post(`/paths/${pathId}/courses`, { courseId, position });
  }

  async function removeCourseFromPath(pathId: string, courseId: string) {
    await api.delete(`/paths/${pathId}/courses/${courseId}`);
  }

  async function reorderCourses(pathId: string, order: string[]) {
    await api.patch(`/paths/${pathId}/courses/reorder`, { order });
  }

  async function setPrerequisites(courseId: string, prerequisiteIds: string[]) {
    await api.put(`/courses/${courseId}/prerequisites`, { prerequisiteIds });
  }

  async function getPrerequisites(courseId: string) {
    return api.get<{ id: string; title: string; slug: string }[]>(`/courses/${courseId}/prerequisites`);
  }

  return {
    isSaving,
    createPath,
    updatePath,
    deletePath,
    addCourseToPath,
    removeCourseFromPath,
    reorderCourses,
    setPrerequisites,
    getPrerequisites,
  };
}

import { ref } from 'vue';
import { useApi } from './useApi';

interface PathListItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  status: string;
  coursesCount: number;
  estimatedDuration: number;
  createdBy?: { id: string; firstName: string; lastName: string };
}

interface PathDetail extends PathListItem {
  items: {
    courseId: string;
    position: number;
    course: {
      id: string;
      title: string;
      slug: string;
      description: string | null;
      thumbnailUrl: string | null;
      duration: number;
      lessonsCount: number;
      status: string;
    };
  }[];
}

interface PathProgress {
  pathId: string;
  overallProgress: number;
  completedCourses: number;
  totalCourses: number;
  courses: { courseId: string; progress: number; completed: boolean }[];
}

export function usePaths() {
  const api = useApi();
  const paths = ref<PathListItem[]>([]);
  const currentPath = ref<PathDetail | null>(null);
  const pathProgress = ref<PathProgress | null>(null);
  const isLoading = ref(false);

  async function fetchPaths(page = 1, limit = 20) {
    isLoading.value = true;
    try {
      const result = await api.get<{ paths: PathListItem[]; pagination: unknown }>('/paths', {
        params: { page, limit },
      });
      paths.value = result.paths;
      return result;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchPath(idOrSlug: string) {
    isLoading.value = true;
    try {
      currentPath.value = await api.get<PathDetail>(`/paths/${idOrSlug}`);
      return currentPath.value;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchPathProgress(pathId: string) {
    pathProgress.value = await api.get<PathProgress>(`/paths/${pathId}/progress`);
    return pathProgress.value;
  }

  return {
    paths,
    currentPath,
    pathProgress,
    isLoading,
    fetchPaths,
    fetchPath,
    fetchPathProgress,
  };
}

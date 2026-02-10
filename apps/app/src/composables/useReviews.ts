import { ref } from 'vue';
import { useApi } from './useApi';

export interface Review {
  id: string;
  courseId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  course?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

interface ReviewsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ReviewsListResponse {
  reviews: Review[];
  pagination: ReviewsPagination;
}

export interface MyReview {
  id: string;
  courseId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function useReviews() {
  const api = useApi();
  const reviews = ref<Review[]>([]);
  const myReview = ref<MyReview | null>(null);
  const pagination = ref<ReviewsPagination | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchReviews(courseId: string, page = 1, limit = 10) {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await api.get<ReviewsListResponse>('/reviews', {
        courseId, page, limit,
      });
      reviews.value = result.reviews || [];
      pagination.value = result.pagination || null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load reviews';
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchMyReview(courseId: string) {
    try {
      const result = await api.get<MyReview | null>(`/reviews/my/${courseId}`);
      myReview.value = result;
    } catch {
      myReview.value = null;
    }
  }

  async function submitReview(data: {
    courseId: string;
    rating: number;
    title?: string;
    comment?: string;
  }) {
    const result = await api.post<MyReview>('/reviews', data);
    myReview.value = result;
    return result;
  }

  async function updateReview(id: string, data: {
    rating?: number;
    title?: string | null;
    comment?: string | null;
  }) {
    const result = await api.patch<MyReview>(`/reviews/${id}`, data);
    myReview.value = result;
    return result;
  }

  async function deleteReview(id: string) {
    await api.delete(`/reviews/${id}`);
    myReview.value = null;
  }

  async function fetchPendingReviews(page = 1, limit = 20) {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await api.get<ReviewsListResponse>('/reviews/pending', {
        page, limit,
      });
      reviews.value = result.reviews || [];
      pagination.value = result.pagination || null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load pending reviews';
    } finally {
      isLoading.value = false;
    }
  }

  async function moderateReview(id: string, action: 'approve' | 'reject', note?: string) {
    await api.post(`/reviews/${id}/moderate`, { action, note });
  }

  return {
    reviews,
    myReview,
    pagination,
    isLoading,
    error,
    fetchReviews,
    fetchMyReview,
    submitReview,
    updateReview,
    deleteReview,
    fetchPendingReviews,
    moderateReview,
  };
}

import { z } from 'zod';

const courseCategoryValues = [
  'development', 'design', 'business', 'marketing',
  'data_science', 'language', 'personal_development', 'other',
] as const;

const courseLevelValues = [
  'beginner', 'intermediate', 'advanced', 'all_levels',
] as const;

export const searchCoursesQuery = z.object({
  q: z.string().optional(),
  category: z.enum(courseCategoryValues).optional(),
  level: z.enum(courseLevelValues).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['relevance', 'newest', 'rating', 'title']).optional().default('relevance'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const searchSuggestionsQuery = z.object({
  q: z.string().min(2).max(100),
});

export type SearchCoursesQuery = z.infer<typeof searchCoursesQuery>;
export type SearchSuggestionsQuery = z.infer<typeof searchSuggestionsQuery>;

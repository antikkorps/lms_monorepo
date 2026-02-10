import type { Context } from 'koa';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../database/sequelize.js';
import { getRedisClient } from '../utils/redis.js';
import { logger } from '../utils/logger.js';
import type { SearchCoursesQuery, SearchSuggestionsQuery } from './schemas.js';

const CACHE_TTL = 300; // 5 minutes

function buildCacheKey(query: SearchCoursesQuery): string {
  const parts = ['search:courses'];
  if (query.q) parts.push(`q=${query.q}`);
  if (query.category) parts.push(`cat=${query.category}`);
  if (query.level) parts.push(`lvl=${query.level}`);
  if (query.minPrice !== undefined) parts.push(`minP=${query.minPrice}`);
  if (query.maxPrice !== undefined) parts.push(`maxP=${query.maxPrice}`);
  if (query.minRating !== undefined) parts.push(`minR=${query.minRating}`);
  parts.push(`sort=${query.sort}`);
  parts.push(`p=${query.page}`);
  parts.push(`l=${query.limit}`);
  return parts.join(':');
}

/**
 * Full-text search with filters
 * GET /search/courses
 */
export async function searchCourses(ctx: Context): Promise<void> {
  const query = ctx.state.validatedQuery as SearchCoursesQuery;
  const { q, category, level, minPrice, maxPrice, minRating, sort, page, limit } = query;
  const offset = (page - 1) * limit;

  // Try Redis cache
  const cacheKey = buildCacheKey(query);
  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) {
      ctx.body = JSON.parse(cached);
      return;
    }
  } catch (err) {
    logger.warn({ err }, 'Search: Redis cache read failed, proceeding without cache');
  }

  // Build WHERE conditions and replacements
  const conditions: string[] = ["c.status = 'published'", 'c.deleted_at IS NULL'];
  const replacements: Record<string, unknown> = {};

  if (q) {
    conditions.push("c.search_vector @@ plainto_tsquery('english', :q)");
    replacements.q = q;
  }
  if (category) {
    conditions.push('c.category = :category');
    replacements.category = category;
  }
  if (level) {
    conditions.push('c.level = :level');
    replacements.level = level;
  }
  if (minPrice !== undefined) {
    conditions.push('c.price >= :minPrice');
    replacements.minPrice = minPrice;
  }
  if (maxPrice !== undefined) {
    conditions.push('c.price <= :maxPrice');
    replacements.maxPrice = maxPrice;
  }
  if (minRating !== undefined) {
    conditions.push('c.average_rating >= :minRating');
    replacements.minRating = minRating;
  }

  const whereClause = conditions.join(' AND ');

  // Build ORDER BY
  let orderClause: string;
  if (q && sort === 'relevance') {
    orderClause = "ts_rank(c.search_vector, plainto_tsquery('english', :q)) DESC, c.created_at DESC";
  } else if (sort === 'rating') {
    orderClause = 'c.average_rating DESC, c.created_at DESC';
  } else if (sort === 'title') {
    orderClause = 'c.title ASC';
  } else {
    // newest or relevance without q
    orderClause = 'c.created_at DESC';
  }

  // Count query
  const countResult = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM courses c WHERE ${whereClause}`,
    { replacements, type: QueryTypes.SELECT }
  );
  const total = parseInt(countResult[0].count, 10);

  // Data query
  const courses = await sequelize.query(
    `SELECT
      c.id, c.title, c.slug, c.description, c.thumbnail_url as "thumbnailUrl",
      c.price, c.currency, c.duration, c.chapters_count as "chaptersCount",
      c.lessons_count as "lessonsCount", c.average_rating as "averageRating",
      c.ratings_count as "ratingsCount", c.category, c.level, c.created_at as "createdAt",
      u.id as "instructorId", u.first_name as "instructorFirstName",
      u.last_name as "instructorLastName", u.avatar_url as "instructorAvatarUrl"
    FROM courses c
    JOIN users u ON c.instructor_id = u.id
    WHERE ${whereClause}
    ORDER BY ${orderClause}
    LIMIT :limit OFFSET :offset`,
    {
      replacements: { ...replacements, limit, offset },
      type: QueryTypes.SELECT,
    }
  );

  // Transform to match existing API shape
  const data = (courses as Record<string, unknown>[]).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    price: row.price,
    currency: row.currency,
    duration: row.duration,
    chaptersCount: row.chaptersCount,
    lessonsCount: row.lessonsCount,
    averageRating: row.averageRating,
    ratingsCount: row.ratingsCount,
    category: row.category,
    level: row.level,
    createdAt: row.createdAt,
    instructor: {
      id: row.instructorId,
      firstName: row.instructorFirstName,
      lastName: row.instructorLastName,
      avatarUrl: row.instructorAvatarUrl,
    },
  }));

  const totalPages = Math.ceil(total / limit);
  const result = {
    data,
    pagination: { page, limit, total, totalPages },
  };

  // Cache result
  try {
    const redis = getRedisClient();
    await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
  } catch (err) {
    logger.warn({ err }, 'Search: Redis cache write failed');
  }

  ctx.body = result;
}

/**
 * Autocomplete suggestions using pg_trgm similarity
 * GET /search/suggestions
 */
export async function searchSuggestions(ctx: Context): Promise<void> {
  const { q } = ctx.state.validatedQuery as SearchSuggestionsQuery;

  const suggestions = await sequelize.query<{
    id: string;
    title: string;
    slug: string;
    category: string;
  }>(
    `SELECT id, title, slug, category
     FROM courses
     WHERE status = 'published'
       AND deleted_at IS NULL
       AND (similarity(title, :q) > 0.1 OR title ILIKE :pattern)
     ORDER BY similarity(title, :q) DESC
     LIMIT 8`,
    {
      replacements: { q, pattern: `%${q}%` },
      type: QueryTypes.SELECT,
    }
  );

  ctx.body = { data: suggestions };
}

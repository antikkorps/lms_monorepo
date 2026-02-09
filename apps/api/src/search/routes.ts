import Router from '@koa/router';
import { optionalAuthenticate } from '../auth/middleware.js';
import { searchCourses, searchSuggestions } from './controller.js';
import { searchCoursesQuery, searchSuggestionsQuery } from './schemas.js';
import type { Context, Next } from 'koa';

/**
 * Validate query params and store on ctx.state.validatedQuery
 */
function validateSearchQuery(schema: import('zod').ZodSchema) {
  return async (ctx: Context, next: Next): Promise<void> => {
    const result = schema.safeParse(ctx.query);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      ctx.status = 400;
      ctx.body = { error: `Validation error: ${message}` };
      return;
    }
    ctx.state.validatedQuery = result.data;
    await next();
  };
}

export const searchRouter = new Router({ prefix: '/search' });

searchRouter.get(
  '/courses',
  optionalAuthenticate,
  validateSearchQuery(searchCoursesQuery),
  searchCourses
);

searchRouter.get(
  '/suggestions',
  optionalAuthenticate,
  validateSearchQuery(searchSuggestionsQuery),
  searchSuggestions
);

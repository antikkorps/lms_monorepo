# Claude Code Configuration - LMS Platform

> **Project**: LMS IA Platform (Hybrid B2C/B2B)
> **Last Modified**: 2026-01-14

## Context Files

- **Primary Rules**: `RULES.md` - Full project specification and constraints
- **Specs Directory**: `docs/specs/` - Feature specifications
- **Todos**: `apps/*/todos/` - Per-app task tracking

## Quick Stack Reference

- **Monorepo**: Nx (Integrated mode)
- **Backend**: Koa.js + Sequelize + Zod
- **Frontend**: Vue 3.5 + Tailwind 4
- **Landing**: Astro + Tailwind 4
- **Database**: PostgreSQL + Redis
- **Tests**: Vitest + Playwright

## Critical Constraints

1. **Shared libraries** (`@shared/*`) must be pure TypeScript (no Node/Browser deps)
2. **Tailwind 4** uses CSS-first approach (not tailwind.config.js)
3. **All API calls** to external services need Circuit Breaker pattern
4. **Graceful shutdown** mandatory for `apps/api`
5. **Soft deletes** (`paranoid: true`) for user-related entities

## Git Conventions

**Branching workflow:**
```
feat/* ──► dev ──► main
```
- Feature branches are created from `dev`
- PRs target `dev` (never `main` directly)
- `main` is updated by merging `dev` when ready for release

**Commit rules:**
- No "Claude Code" references in commit messages or PR descriptions
- No "Co-Authored-By: Claude" lines
- Follow conventional commits (`feat`, `fix`, `chore`, etc.)

## Workflow

1. Check `RULES.md` before starting
2. Create/update todos in `apps/*/todos/` with dates
3. Work on feature branches from `dev`
4. Follow PLAN-ACT-VERIFY methodology

## Nx Commands

```bash
nx serve api          # Backend dev server
nx serve app          # Frontend dev server
nx test <project>     # Run tests
nx build <project>    # Production build
nx graph              # Dependency visualization
```

## File Locations

- API Routes: `apps/api/src/routes/`
- Vue Components: `apps/app/src/components/`
- Shared Schemas: `libs/shared/schemas/src/`
- Shared Types: `libs/shared/types/src/`
- Docker Config: `docker/`

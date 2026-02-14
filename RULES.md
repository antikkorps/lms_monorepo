# LMS Platform - AI Configuration & Project Rules

> **Last Modified**: 2026-01-14
> **Version**: 1.0.0
> **Methodology**: BMAD Compliant + PLAN-ACT-VERIFY

---

## 1. PROJECT OVERVIEW

### Vision

High-performance video training platform (LMS) with AI-first approach.
**Hybrid Model**: B2C (Solo course purchases) + B2B (Enterprise tenants with dashboards).

### Key Principles

- **SOTA 2026**: Robust, secure, highly tested architecture ready for LLM integration (V2)
- **Row-Level Multi-Tenancy**: Single database with `tenant_id` isolation
- **Repository Pattern**: Prepared for future database silo per large tenant
- **Circuit Breaker**: All external API calls (LLM, Video, Payment) must be protected

---

## 2. TECHNICAL STACK (STRICT CONSTRAINTS)

### Monorepo

- **Build System**: Nx (Integrated Monorepo mode)
- **Package Manager**: npm (latest)
- **Node.js**: v24 LTS target (v22+ acceptable)

### Backend (`apps/api`)

- **Framework**: Koa.js (TypeScript strict mode)
- **ORM**: Sequelize with strict typing
- **Validation**: Zod (shared via `@shared/schemas`)
- **Cache/Rate Limit**: Redis
- **Logging**: Pino (structured JSON logs)
- **Graceful Shutdown**: SIGTERM handling mandatory

### Frontend (`apps/app`)

- **Framework**: Vue.js 3.5+ (Composition API) or Nuxt
- **Styling**: Tailwind CSS 4.0 (CSS-first approach)
- **State**: Pinia (if needed)

### Landing Page (`apps/landing`)

- **Framework**: Astro
- **Styling**: Tailwind CSS 4.0

### Shared Libraries

- `@shared/schemas`: Zod schemas (validation)
- `@shared/types`: TypeScript interfaces/types
- `@shared/ui`: Reusable Vue components

> **CRITICAL**: `@shared/*` libraries MUST be pure TypeScript without Node.js or Browser-specific dependencies for full portability.

### Database

- **Primary**: PostgreSQL with pgvector extension
- **Cache**: Redis
- **Storage**: Cloudflare R2 (badges, media)

### External Services

- **Video**: Cloudflare Stream / Mux / AWS MediaConvert
- **Payment**: Stripe (with Adapter Pattern for anti-lock-in)
- **Email**: Postmark / SendGrid
- **CDN**: Cloudflare

### DevOps

- **Containerization**: Docker Compose (full hot-reload)
- **CI/CD**: GitHub Actions
- **Environments**: dev / staging / prod
- **SSL**: Caddy (automatic)
- **Monitoring**: Sentry + Prometheus/Grafana
- **Job Queue**: BullMQ

### Testing

- **Unit/Integration**: Vitest
- **E2E**: Playwright
- **Coverage Target**: 100% on calculation functions

---

## 3. ARCHITECTURE RULES

### File Structure

```
lms_monorepo/
├── apps/
│   ├── api/           # Koa.js backend
│   │   ├── src/
│   │   └── todos/     # Feature-specific todos
│   ├── app/           # Vue.js frontend
│   │   ├── src/
│   │   └── todos/
│   └── landing/       # Astro landing page
│       ├── src/
│       └── todos/
├── libs/
│   └── shared/
│       ├── schemas/   # @shared/schemas (Zod)
│       ├── types/     # @shared/types
│       └── ui/        # @shared/ui (Vue components)
├── docker/
├── docs/
│   └── specs/
└── tools/
```

### Nx Tags & Constraints

```
scope:api       - Backend application
scope:app       - Frontend application
scope:landing   - Landing page
scope:shared    - Shared libraries
type:app        - Application
type:lib        - Library
type:util       - Utility library
```

### Dependency Rules

- `scope:shared` can be imported by ALL
- `scope:api` CANNOT import from `scope:app` or `scope:landing`
- `scope:app` CANNOT import from `scope:api` or `scope:landing`
- `type:app` can import from `type:lib` and `type:util`

---

## 4. CODING STANDARDS

### General

- **Language**: TypeScript strict mode everywhere
- **Comments**: English only
- **Function names**: Self-documenting (no abbreviations)
- **No magic values**: Use constants/enums
- **Number methods**: Use `Number.parseInt()`, `Number.parseFloat()`, `Number.isNaN()`, `Number.isFinite()` instead of global functions

### DRY Principles (Don't Repeat Yourself)

- **Single Source of Truth**: Each piece of knowledge must have a single, authoritative representation
- **Shared Schemas**: Use `@shared/schemas` for validation rules shared between frontend and backend
- **Shared Types**: Use `@shared/types` for TypeScript interfaces used across apps
- **Centralized Constants**: Define enums and constants in shared libs, never duplicate
- **Utility Functions**: Extract repeated logic into `@shared/utils` or app-specific utils
- **Database Models**: Single model definition per entity, never duplicate field definitions
- **Error Handling**: Use centralized `AppError` class, don't create ad-hoc error objects
- **Config Management**: Single config source per app, environment variables in one place
- **API Response Format**: Consistent response wrapper (`{ success, data, error }`) everywhere
- **Middleware Reuse**: Create composable middleware, avoid duplicating auth/validation logic

> **Rule of Three**: If code appears 3+ times, extract it. Two occurrences may be acceptable.

### API Design

- **Versioning**: `/api/v1/`
- **Documentation**: OpenAPI/Swagger auto-generated
- **Error handling**: Centralized `AppError` class
- **Rate limiting**: Differentiated B2C (strict) vs B2B (permissive)

### Database

- **Soft deletes**: `paranoid: true` for user-related entities
- **Timestamps**: `createdAt`, `updatedAt` on all tables
- **Migrations**: Sequelize CLI, never manual SQL

### Security

- **Auth**: JWT via HTTP-Only cookies
- **Headers**: Helmet.js + strict CORS
- **Validation**: Zod on all inputs
- **Session**: Redis-backed blacklist for immediate revocation
- **Sanitization** (Security by Design):
  - All user-generated content (discussions, notes, comments) must be sanitized before rendering
  - Use DOMPurify on frontend for any HTML/Markdown rendering
  - Escape HTML by default; only allow safe tags when explicitly needed
  - Store original content in DB, sanitize at display time
  - Never use `v-html` or `dangerouslySetInnerHTML` without sanitization

---

## 5. WORKFLOW METHODOLOGY

### PLAN-ACT-VERIFY

1. **PLAN**: Define scope, create todos, identify dependencies
2. **ACT**: Implement with small, focused commits
3. **VERIFY**: Run tests, validate against specs

### BMAD Compliance

- Feature branches from `dev`
- PR review before merge
- Dated todos per feature
- Specs written before implementation

### Branch Naming

```
feat/feature-name     # New features
fix/bug-description   # Bug fixes
refactor/scope        # Refactoring
docs/topic            # Documentation
```

### Todo Format

```markdown
# Feature Name - Todo List

## Modified: YYYY-MM-DD

### Pending

- [ ] Task description

### In Progress

- [ ] Task description (WIP)

### Completed

- [x] Task description (Done: YYYY-MM-DD)
```

---

## 6. DATA MODELS (REFERENCE)

### Core Entities

- **Users**: `tenant_id` nullable (NULL = B2C Solo)
- **Tenants**: Enterprise entities with seats/licenses
- **Groups**: Sub-entities of Tenant for user grouping
- **Courses**: Video content with chapters
- **Purchases**: Payment records (Solo or B2B)
- **Badges**: Gamification rewards

### RBAC Roles

1. SuperAdmin - Global platform management
2. Admin Entreprise - Tenant management, billing
3. Manager - Group-specific management
4. Formateur - Content editing, quiz correction
5. Apprenant - Course consumption, quizzes, badges

---

## 7. PHASE TRACKING

### Phase 1: Workspace Initialization

- [x] Create Nx monorepo
- [ ] Configure Docker Compose
- [ ] Setup hot-reload
- [ ] CI/CD pipelines
- [ ] Database seeding

### Phase 2: Core Backend (Security & Auth)

- [ ] Error handling middleware
- [ ] Rate limiting with Redis
- [ ] Auth system (Solo/Pro)
- [ ] Email integration

### Phase 3: Data Logic & Stripe

- [x] Sequelize migrations
- [x] Stripe webhooks (idempotent)
- [x] B2B pricing logic (volume discounts, license management)
- [x] Basic analytics
- [x] Advanced analytics (B2B revenue, per-course detail, PDF export, license analytics)

### Phase 4: Frontend & Dashboard

- [x] Tailwind 4 design system
- [x] VideoPlayer component
- [x] QuizzEngine component
- [x] Dashboard views (learner, tenant admin, super admin)

### Phase 5: Delivery & Tests

- [ ] Playwright E2E tests
- [ ] Data isolation validation
- [ ] Database seeding / demo data

---

## 8. QUICK REFERENCE

### Commands

```bash
# Development
nx serve api          # Start API
nx serve app          # Start frontend
nx serve landing      # Start landing page

# Testing
nx test api           # Unit tests
nx e2e app-e2e        # E2E tests

# Build
nx build api          # Build API
nx build app          # Build frontend

# Docker
docker-compose up     # Full stack
docker-compose up -d  # Detached mode
```

### Environment Variables

```
NODE_ENV=development|staging|production
DATABASE_URL=postgres://...
REDIS_URL=redis://...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_SECRET=...
```

---

> **Note for AI Agents**: Always check this file before starting work. Follow PLAN-ACT-VERIFY methodology and update todos as you progress.

# LMS Platform - Backlog

## Modified: 2026-01-28

---

## Critical (MVP Blockers)

### Payments & Billing

- [ ] Implement Stripe webhook handlers (payment success, failure, refund)
- [ ] Create checkout flow UI
- [ ] Handle subscription lifecycle (B2B seats)
- [ ] Invoice generation

### Content Creation UI

- [x] Course creator/editor page (Done: 2026-01-24)
- [x] Chapter management UI with drag & drop reorder (Done: 2026-01-24)
- [x] Lesson editor with settings/content/quiz tabs (Done: 2026-01-24)
- [x] Quiz question builder UI (Done: 2026-01-24)
- [x] Quiz API endpoints (apps/api/src/quiz/) (Done: 2026-01-24)
- [x] Content preview mode (learner view from instructor) (Done: 2026-01-25)

### Media Uploads

- [x] Video upload with progress indicator (Done: 2026-01-26)
- [x] Document upload (PDF, slides) (Done: 2026-01-26)
- [x] Thumbnail/image upload (Done: 2026-01-26)
- [x] Integration with cloud storage (Cloudflare R2) (Done: 2026-01-26)
- [x] Intégrer UploadZone dans lesson editor (vidéos) et course builder (thumbnails) (Done: 2026-01-26)
- [ ] Tester R2 avec credentials réels (tests prêts: `R2_INTEGRATION_TEST=true`)
- [ ] Video transcoding pipeline

### API Integration (Frontend)

- [x] Replace mock data with real API calls in composables (Done: 2026-01-26)
  - [x] Dashboard API (useDashboard) (Done: 2026-01-25)
  - [x] Progress API (useProgress) (Done: 2026-01-25)
  - [x] Quiz API (useQuiz) (Done: 2026-01-25)
  - [x] Analytics API (useAnalytics) (Done: 2026-01-26)
  - [x] Badges API (useBadges) (Done: 2026-01-26)
  - [x] Tenant Dashboard API (useTenantDashboard) (Done: 2026-01-26)
  - [x] Tenant Members API (useTenantMembers) (Done: 2026-01-26)
  - [x] Seats API (useSeats) (Done: 2026-01-26)
- [x] Add error boundaries for API failures (Done: 2026-01-26)
- [ ] Implement optimistic updates for better UX
- [x] Add retry logic with exponential backoff (Done: 2026-01-26)

---

## Important (Post-MVP)

### Notifications

- [ ] Email notifications (course updates, new content)
- [ ] In-app notification system
- [ ] Notification preferences UI
- [ ] Digest emails (weekly progress)

### Testing & Quality

- [ ] E2E tests with Playwright (critical user flows)
- [ ] Auth controller unit tests
- [ ] Redis session tests
- [ ] Integration tests (API + DB)
- [ ] Performance testing

### Documentation

- [ ] OpenAPI/Swagger documentation
- [ ] API versioning docs
- [ ] Developer onboarding guide
- [ ] Deployment runbook

### Search & Discovery

- [ ] Full-text search (courses, lessons)
- [ ] Advanced filters (category, duration, level)
- [ ] Search suggestions/autocomplete

---

## Nice-to-Have (Future)

### Gamification & Engagement

- [ ] Course completion certificates (PDF generation)
- [ ] Leaderboards (per course, global)
- [ ] Course reviews & ratings
- [ ] Achievement streaks

### Analytics & Reporting

- [ ] Admin analytics dashboard (revenue, users, engagement)
- [ ] Export reports (CSV, PDF)
- [ ] Video watch analytics (drop-off points)
- [ ] Quiz performance insights

### Advanced Features

- [ ] Batch user import (CSV)
- [ ] Course bundles/paths
- [ ] Prerequisite courses
- [ ] Live sessions (webinars)
- [ ] Mobile app (React Native / Capacitor)
- [ ] Offline mode (PWA)
- [ ] AI-powered recommendations

---

## Notes

- Critical items block production launch
- Important items improve quality but not blockers
- Nice-to-have are future roadmap items

## Pour info

**Tous les composables sont maintenant connectés aux APIs réelles (2026-01-26)**

| Composable | Description | API |
|------------|-------------|-----|
| useAnalytics.ts | Analytics learner | GET /learner/analytics |
| useBadges.ts | Badges/achievements | GET /user/badges |
| useSeats.ts | Gestion sièges B2B | GET/POST /tenant/seats/* |
| useTenantDashboard.ts | Dashboard admin tenant | GET /tenant/dashboard |
| useTenantMembers.ts | Membres du tenant | CRUD /tenant/members/* |

**Upload System (2026-01-26)**

Architecture flexible avec interface abstraite:
- `LocalStorageProvider` pour dev (fichiers locaux)
- `R2StorageProvider` pour prod (Cloudflare R2 / S3-compatible)

| Endpoint | Description |
|----------|-------------|
| POST /uploads/image | Upload image (max 10MB) |
| POST /uploads/video | Upload vidéo (max 2GB) |
| POST /uploads/document | Upload document (max 100MB) |
| POST /uploads/signed-url | URL signée pour upload direct |
| GET /uploads/:key | Info fichier + URL signée |
| DELETE /uploads/:key | Supprimer fichier |

Composables/Components:
- `useUpload.ts` - Progress tracking avec XHR
- `UploadZone.vue` - Drag & drop avec preview

**Error Handling (2026-01-26)**

- `useApi.ts` - Retry automatique avec exponential backoff (max 3 retries)
  - Retries sur: network errors, 408, 429, 500, 502, 503, 504
  - Délai: 1s base, max 10s, avec jitter ±25%
- `ErrorBoundary.vue` - Capture erreurs de rendu dans les composants enfants
- `AsyncLoader.vue` - États loading/error/empty avec retry button

**Landing Page Complete (2026-01-28)**

16 pages statiques (8 EN + 8 FR) avec design system unifié:

| Page | EN | FR |
|------|----|----|
| Home | `/` | `/fr` |
| Pricing | `/pricing` | `/fr/pricing` |
| Features | `/features` | `/fr/features` |
| FAQ | `/faq` | `/fr/faq` |
| About | `/about` | `/fr/about` |
| Contact | `/contact` | `/fr/contact` |
| Privacy | `/privacy` | `/fr/privacy` |
| Terms | `/terms` | `/fr/terms` |

Composants créés:
- UI: Button, Card, Input, Textarea, Badge
- Sections: Hero, Features, Pricing, FAQ, Testimonials, CTA

Features:
- Design system shadcn-compatible (OKLCH colors)
- Dark mode avec localStorage
- Menu mobile full-screen slide-in
- Touch targets 44px+ pour mobile
- SEO: meta tags, OG, Twitter cards, hreflang, sitemap

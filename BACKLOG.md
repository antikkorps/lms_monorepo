# LMS Platform - Backlog

## Modified: 2026-01-25

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

- [ ] Video upload with progress indicator
- [ ] Document upload (PDF, slides)
- [ ] Thumbnail/image upload
- [ ] Integration with cloud storage (S3/Cloudinary)
- [ ] Video transcoding pipeline

### API Integration (Frontend)

- [x] Replace mock data with real API calls in composables (Partial - Done: 2026-01-25)
  - [x] Dashboard API (useDashboard)
  - [x] Progress API (useProgress)
  - [x] Quiz API (useQuiz)
  - [ ] Remaining composables
- [ ] Add error boundaries for API failures
- [ ] Implement optimistic updates for better UX
- [ ] Add retry logic with exponential backoff

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

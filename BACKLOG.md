# LMS Platform - Backlog

## Modified: 2026-01-24

---

## Critical (MVP Blockers)

### Payments & Billing
- [ ] Implement Stripe webhook handlers (payment success, failure, refund)
- [ ] Create checkout flow UI
- [ ] Handle subscription lifecycle (B2B seats)
- [ ] Invoice generation

### Content Creation UI
- [ ] Course creator/editor page (apps/app)
- [ ] Chapter management UI (drag & drop reorder)
- [ ] Lesson editor (video, quiz, document types)
- [ ] Quiz question builder UI
- [ ] Content preview mode

### Media Uploads
- [ ] Video upload with progress indicator
- [ ] Document upload (PDF, slides)
- [ ] Thumbnail/image upload
- [ ] Integration with cloud storage (S3/Cloudinary)
- [ ] Video transcoding pipeline

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

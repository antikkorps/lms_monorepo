# LMS Platform - Backlog

## Modified: 2026-01-31

---

## Critical (MVP Blockers)

### Payments & Billing

- [x] Stripe service with Circuit Breaker pattern (Done: 2026-01-30)
- [x] Implement Stripe webhook handlers (payment success, failure) (Done: 2026-01-30)
- [x] Create checkout flow UI (B2C course purchases) (Done: 2026-01-30)
- [x] Payment success/cancel pages (Done: 2026-01-30)
- [x] Enrollment status check in course API (Done: 2026-01-30)
- [ ] Handle subscription lifecycle (B2B seats)
- [ ] Invoice generation
- [x] Refund handling (Done: 2026-01-31)
- [x] Purchase history page for learners (Done: 2026-01-31)
- [x] Refund request flow (auto < 1h, admin approval > 1h) (Done: 2026-01-31)
- [x] Admin refund requests management (super admin only, B2C) (Done: 2026-01-31)

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
- [x] Tester R2 avec credentials réels (Done: 2026-01-28)
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

### Notifications (branche feat/notifications) ✅

- [x] In-app notification system avec SSE temps réel (Done: 2026-01-31)
- [x] Email notifications (lesson/course completed, quiz passed, badge earned) (Done: 2026-01-31)
- [x] Notification preferences UI (email, in-app, digest) (Done: 2026-01-31)
- [x] Digest emails (weekly summary) avec BullMQ scheduler (Done: 2026-01-31)
- [x] Notification bell avec dropdown dans navbar (Done: 2026-01-31)
- [x] Page notifications complète avec pagination (Done: 2026-01-31)
- [ ] i18n des notifications et emails (EN/FR) - Plan créé

### Testing & Quality

- [x] E2E tests with Playwright setup (Done: 2026-01-28)
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

- [x] Course completion certificates (PDF generation) (Done: 2026-01-28)
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

**Stripe Integration B2C (2026-01-30)**

Architecture avec Circuit Breaker (opossum):
- `apps/api/src/services/stripe/` - Service Stripe singleton
- `apps/api/src/payments/` - Routes et controllers

| Endpoint | Description |
|----------|-------------|
| POST /payments/checkout/course | Créer session Checkout Stripe |
| POST /payments/verify | Vérifier un achat après paiement |
| GET /payments/purchases | Liste des achats de l'utilisateur |
| POST /webhooks/stripe | Webhook Stripe (raw body) |

Frontend:
- `usePayments.ts` - Composable pour les achats
- `PaymentSuccessView.vue` - Page de succès après paiement
- `PaymentCancelView.vue` - Page d'annulation
- Bouton "Acheter" dans CourseDetailView (si non inscrit)

Webhook events gérés:
- `checkout.session.completed` → Finalise l'achat (Purchase.status = COMPLETED)
- `payment_intent.payment_failed` → Log l'échec

À faire (B2B):
- Subscriptions pour les tenants (seats)
- Customer Portal pour gérer les abonnements
- Facturation récurrente

**Notifications System (2026-01-31)**

Architecture avec BullMQ et SSE:
- `apps/api/src/notifications/` - Controller et routes
- `apps/api/src/services/notifications/` - Service de création
- `apps/api/src/queue/` - Jobs BullMQ (email, digest)
- `apps/api/src/triggers/` - Hooks Sequelize pour auto-trigger

| Endpoint | Description |
|----------|-------------|
| GET /notifications | Liste paginée des notifications |
| GET /notifications/unread-count | Compteur non lues |
| GET /notifications/stream | SSE temps réel |
| PATCH /notifications/:id/read | Marquer comme lue |
| POST /notifications/mark-all-read | Tout marquer comme lu |
| DELETE /notifications/:id | Supprimer une notification |
| GET /notifications/preferences | Préférences utilisateur |
| PATCH /notifications/preferences | Modifier préférences |

Types de notifications:
- `lesson_completed` - Leçon terminée
- `course_completed` - Cours terminé
- `quiz_passed` - Quiz réussi
- `badge_earned` - Badge obtenu
- `discussion_reply` - Réponse discussion
- `purchase_confirmed` - Achat confirmé

Frontend:
- `useNotifications.ts` - SSE + CRUD notifications
- `useNotificationPreferences.ts` - Préférences
- `NotificationBell.vue` - Cloche avec badge
- `NotificationDropdown.vue` - Mini-centre
- `NotificationsView.vue` - Page complète
- `NotificationSettingsView.vue` - Préférences

**Refund System (2026-01-31)**

Flux de remboursement B2C:
- Demande < 1h après achat → Auto-remboursement via Stripe
- Demande > 1h après achat → En attente d'approbation admin
- Super admin peut approuver/rejeter les demandes

| Endpoint | Description |
|----------|-------------|
| POST /payments/:id/request-refund | Demander remboursement |
| GET /payments/refund-requests | Liste demandes (super admin) |
| POST /payments/:id/review-refund | Approuver/rejeter (super admin) |

Frontend:
- `PurchaseHistoryView.vue` - Historique achats + demande refund
- `RefundRequestsView.vue` - Admin gestion demandes

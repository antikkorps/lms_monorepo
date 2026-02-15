# Landing (Astro) - Deployment Preparation

## Created: 2026-02-14
## Target: 2026-02-15 (dev deployment)

---

### Coming Soon Page

- [x] Create Coming Soon page (`/coming-soon`) with newsletter signup form (Done: 2026-02-15)
- [x] Redirect all Hero CTAs from `/app/register` → `/coming-soon` (Done: 2026-02-15)
- [x] Redirect pricing CTAs → `/coming-soon` (Done: 2026-02-15)
- [x] Add Coming Soon i18n (EN/FR) (Done: 2026-02-15)

### Legal Pages (Placeholders)

- [x] Create placeholder legal pages: Terms of Service (CGU) (Already existed: 2026-01-28)
- [x] Create placeholder legal pages: Privacy Policy (Confidentialite) (Already existed: 2026-01-28)
- [x] Create placeholder Contact page (Already existed: 2026-01-28)

### Error Handling & SEO

- [x] Add 404 page (Done: 2026-02-15)
- [x] Verify sitemap includes new pages (Done: 2026-02-15 — 20 pages, coming-soon included with hreflang)

---

### Notes

- Legal pages already existed from Phase 1 (2026-01-28)
- Coming Soon page calls `POST /api/v1/newsletter/subscribe`
- All CTA redirects are temporary until app registration is publicly available
- To revert CTAs: replace `/coming-soon` with `/app/register` in all landing pages + Layout

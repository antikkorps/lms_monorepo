# Landing (Astro) - Deployment Preparation

## Created: 2026-02-14
## Target: 2026-02-15 (dev deployment)

---

### Coming Soon Page

- [ ] Create Coming Soon page (`/coming-soon`) with newsletter signup form
- [ ] Redirect all Hero CTAs from `/app/register` → `/coming-soon`
- [ ] Redirect pricing CTAs → `/coming-soon`
- [ ] Add Coming Soon i18n (EN/FR)

### Legal Pages (Placeholders)

- [ ] Create placeholder legal pages: Terms of Service (CGU)
- [ ] Create placeholder legal pages: Privacy Policy (Confidentialite)
- [ ] Create placeholder Contact page

### Error Handling & SEO

- [ ] Add 404 page
- [ ] Verify sitemap includes new pages

---

### Notes

- Legal pages are **placeholders** — real content to be provided later
- Coming Soon page must include newsletter form that calls `POST /api/v1/newsletter/subscribe`
- All CTA redirects are temporary until app registration is publicly available

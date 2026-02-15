# API - Deployment Preparation

## Created: 2026-02-14
## Target: 2026-02-15 (dev deployment)

---

### Database & Seed Cleanup

- [x] Create production cleanup script (`cleanup-seed.ts`) — purge seeds + create real superadmin (Done: 2026-02-15)
- [x] Add `db:cleanup` npm script to root `package.json` (Done: 2026-02-15)

### New Endpoints

- [x] Create newsletter subscribe endpoint (`POST /api/v1/newsletter/subscribe`) — forward to Mailjet Contacts API (Done: 2026-02-15)
- [x] Add `MAILJET_CONTACT_LIST_ID` to config (Done: 2026-02-15)
- [x] Health check endpoint (`GET /api/v1/health/ready`) — real DB + Redis connectivity checks (Done: 2026-02-15)

### Auth Flow Verification

- [ ] Verify B2C registration flow end-to-end (register → verify email → login)
- [ ] Verify B2B invitation flow end-to-end (invite → accept → login)

### Stripe Configuration

- [ ] Configure Stripe test mode (`sk_test_*` keys in `.env.production`)
- [ ] Configure Stripe webhook URL for production domain

### Cloudflare

- [ ] Configure Cloudflare Stream webhook URL for production domain

### Environment & Email

- [ ] Set up `.env.production` with all credentials (Mailjet, Stripe test keys, DB, Redis, JWT, CORS origins, frontend URL)
- [ ] Test email sending works with Mailjet provider
- [ ] Test ALL email templates end-to-end: verification, password reset, invitation, notification, digest

---

### Notes

- Stripe in **test mode** — real payment flow with fictitious cards
- Mailjet must be configured for both transactional emails and newsletter contacts API
- Health check returns structured JSON with per-service status
- `npm run db:cleanup` requires `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars

# API - Deployment Preparation

## Created: 2026-02-14
## Target: 2026-02-15 (dev deployment)

---

### Database & Seed Cleanup

- [ ] Create production cleanup script (`cleanup-seed.ts`) — purge seeds + create real superadmin
- [ ] Add `db:cleanup` npm script to root `package.json`

### New Endpoints

- [ ] Create newsletter subscribe endpoint (`POST /api/v1/newsletter/subscribe`) — forward to Mailjet Contacts API
- [ ] Add `MAILJET_CONTACT_LIST_ID` to config
- [ ] Add health check endpoint (`GET /api/v1/health`) — DB + Redis connectivity

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
- Health check should return structured JSON with per-service status

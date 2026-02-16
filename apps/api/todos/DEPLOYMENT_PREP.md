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

### Production Infrastructure

- [x] docker-compose.prod.yml — full stack (postgres, redis, api, app, landing, caddy, cloudflared) (Done: 2026-02-16)
- [x] Caddyfile reverse proxy (HTTP, TLS via Cloudflare) (Done: 2026-02-16)
- [x] Cloudflare Tunnel config template (Done: 2026-02-16)
- [x] .env.production.example with Docker-internal hostnames (Done: 2026-02-16)
- [x] .dockerignore for optimized build context (Done: 2026-02-16)
- [x] VITE_API_URL / VITE_STRIPE_PUBLISHABLE_KEY build args in app Dockerfile (Done: 2026-02-16)
- [x] `app.proxy = true` in Koa for X-Forwarded-* headers (Done: 2026-02-16)
- [x] Landing site URL updated to iqon-ia.com (Done: 2026-02-16)
- [x] Deploy workflow rewritten to SSH-based (git pull + docker compose build) (Done: 2026-02-16)

### Auth Flow Verification

- [ ] Verify B2C registration flow end-to-end (register → verify email → login)
- [ ] Verify B2B invitation flow end-to-end (invite → accept → login)

### Stripe Configuration

- [ ] Configure Stripe test mode (`sk_test_*` keys in `.env.production`)
- [ ] Configure Stripe webhook URL for production domain

### CI Typecheck Fix

- [ ] Fix `tsc --build` resolution: `@shared/types` resolves to `libs/shared/schemas/src/index.js` instead of `libs/shared/types/src/index.ts` — Invoice types not found (12 errors)
- [ ] Fix `@shared/schemas` not finding `updateTenantSSOSchema` / `tenantSSOConfigSchema` in `tsc --build` mode (despite declarations being correct in `dist/out-tsc/`)
- [ ] Root cause: `tsconfig.app.json` has `composite: false` + path mappings conflict with project references in `--build` mode. Investigate `baseUrl` resolution with extended paths.

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

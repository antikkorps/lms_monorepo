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

- [x] Code review B2C registration flow — fix race condition (register user + seat increment wrapped in transaction) (Done: 2026-02-19)
- [x] Code review B2B invitation flow — fix seat race condition (SELECT FOR UPDATE row locking in acceptInvitation) (Done: 2026-02-19)
- [x] Add email send failure handling in createInvitation — try/catch with logging, invitation still committed (Done: 2026-02-19)
- [x] Add COOKIE_DOMAIN production warning in config validation (Done: 2026-02-19)
- [ ] Live test B2C registration flow end-to-end (register → verify email → login)
- [ ] Live test B2B invitation flow end-to-end (invite → accept → login)

### Stripe Configuration

- [ ] Configure Stripe test mode (`sk_test_*` keys in `.env.production`)
- [ ] Configure Stripe webhook URL for production domain

### CI Typecheck Fix

- [x] Fix `tsc --build` resolution: `@shared/types` resolves to `libs/shared/schemas/src/index.js` instead of `libs/shared/types/src/index.ts` — Invoice types not found (12 errors) (Done: 2026-02-19)
- [x] Fix `@shared/schemas` not finding `updateTenantSSOSchema` / `tenantSSOConfigSchema` in `tsc --build` mode (despite declarations being correct in `dist/out-tsc/`) (Done: 2026-02-19)
- [x] Root cause: `tsconfig.app.json` paths used `../../` prefix resolved from baseUrl (monorepo root), pointing outside project. Fixed paths + emptied `references` to stop stale `.d.ts` redirect. Deleted stale `dist/out-tsc/src/`. (Done: 2026-02-19)

### Database Migrations in Production

- [x] Add migrator as esbuild additional entry point (`database/migrator.mjs`) (Done: 2026-02-19)
- [x] Copy migration SQL files into Docker production image (`/app/migrations/`) (Done: 2026-02-19)
- [x] Add `MIGRATIONS_DIR` env var support in migrator (Done: 2026-02-19)

### Database Backup (Critical)

- [x] Create automated backup script: `pg_dump` → compress → upload to R2 via rclone (Done: 2026-02-21)
- [x] Configure rclone with R2 credentials on the server — via `RCLONE_CONFIG_R2_*` env vars in docker-compose (Done: 2026-02-21)
- [x] Set up cron job (daily backup, e.g. `0 3 * * *`) — in `docker/backup/Dockerfile` (Done: 2026-02-21)
- [x] Add backup retention policy (keep last 30 days) — `BACKUP_RETENTION_DAYS` env var (Done: 2026-02-21)
- [x] Test backup restore procedure — `deploy/scripts/restore.sh` (Done: 2026-02-21)
- [x] Document disaster recovery procedure — backup.sh/restore.sh usage in docker-compose (Done: 2026-02-21)

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
- **Production migration command**: `docker compose exec api node database/migrator.mjs`
- **Migration status**: `docker compose exec api node database/migrator.mjs status`

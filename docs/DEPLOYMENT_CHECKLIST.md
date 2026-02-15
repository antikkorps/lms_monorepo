# IQON-IA — Deployment Checklist

> **Target Date**: 2026-02-16
> **Strategy**: Docker images on GHCR, deployed via `docker compose` on Hetzner VPS with Caddy + Cloudflare Tunnel

---

## 1. Server & Infrastructure

### 1.1 Server Provisioning

- [x] Provision Hetzner VPS (recommended: CX31 or higher)
- [x] Install Docker + Docker Compose
- [ ] Configure Cloudflare DNS + Tunnel
- [ ] Create `deploy/docker-compose.prod.yml` (api, app, landing, postgres, redis, caddy)
- [ ] Create `deploy/Caddyfile` (reverse proxy: landing, app, api — auto HTTPS via Cloudflare DNS challenge)
- [ ] Create `deploy/cloudflared/config.yml` (Cloudflare Tunnel)

### 1.2 DNS Configuration

- [ ] Point landing domain (e.g. `iqon-ia.com`) to Cloudflare Tunnel
- [ ] Point app domain (e.g. `app.iqon-ia.com`) to Cloudflare Tunnel
- [ ] Point API domain (e.g. `api.iqon-ia.com`) to Cloudflare Tunnel
- [ ] TLS handled by Caddy + Cloudflare DNS challenge

---

## 2. Environment Configuration

### 2.1 Create `.env.production`

Copy `.env.example` and fill in **all** production values:

```bash
cp .env.example .env.production
```

| Variable                  | Required | Notes                                                                                    |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `NODE_ENV`                | Yes      | `production`                                                                             |
| `POSTGRES_USER`           | Yes      | Production DB user                                                                       |
| `POSTGRES_PASSWORD`       | Yes      | Strong random password                                                                   |
| `POSTGRES_DB`             | Yes      | Production DB name                                                                       |
| `DATABASE_URL`            | Yes      | Full connection URL matching above                                                       |
| `REDIS_URL`               | Yes      | Production Redis URL                                                                     |
| `JWT_SECRET`              | Yes      | `openssl rand -base64 32`                                                                |
| `JWT_EXPIRES_IN`          | Yes      | Recommend `7d`                                                                           |
| `CORS_ORIGINS`            | Yes      | Production domains, comma-separated (e.g. `https://app.iqon-ia.com,https://iqon-ia.com`) |
| `STRIPE_SECRET_KEY`       | Yes      | `sk_test_*` for test mode                                                                |
| `STRIPE_WEBHOOK_SECRET`   | Yes      | From Stripe dashboard                                                                    |
| `STRIPE_PUBLISHABLE_KEY`  | Yes      | `pk_test_*` for test mode                                                                |
| `EMAIL_PROVIDER`          | Yes      | `mailjet`                                                                                |
| `EMAIL_FROM`              | Yes      | Verified sender email                                                                    |
| `EMAIL_FROM_NAME`         | Yes      | `IQON-IA`                                                                                |
| `MAILJET_API_KEY`         | Yes      | From Mailjet dashboard                                                                   |
| `MAILJET_API_SECRET`      | Yes      | From Mailjet dashboard                                                                   |
| `MAILJET_CONTACT_LIST_ID` | Yes      | Contact list for newsletter                                                              |
| `CLOUDFLARE_ACCOUNT_ID`   | Yes      | For R2 + Stream                                                                          |
| `CLOUDFLARE_API_TOKEN`    | Yes      | With R2 + Stream permissions                                                             |
| `STORAGE_PROVIDER`        | Yes      | `r2` for production                                                                      |
| `R2_ACCESS_KEY_ID`        | Yes      | R2 API token                                                                             |
| `R2_SECRET_ACCESS_KEY`    | Yes      | R2 API secret                                                                            |
| `R2_BUCKET_NAME`          | Yes      | e.g. `iqon-ia-assets`                                                                    |
| `R2_PUBLIC_URL`           | Yes      | Custom domain or R2 public URL                                                           |
| `SSO_CALLBACK_URL`        | If SSO   | Production callback URL                                                                  |
| `GOOGLE_CLIENT_ID`        | If SSO   | Google OAuth credentials                                                                 |
| `MICROSOFT_CLIENT_ID`     | If SSO   | Microsoft OAuth credentials                                                              |
| `ADMIN_EMAIL`             | Cleanup  | Superadmin email                                                                         |
| `ADMIN_PASSWORD`          | Cleanup  | Min 12 chars                                                                             |

---

## 3. Pre-Deploy Verification (local)

### 3.1 Verify Builds

```bash
npx nx run api:build --skip-nx-cache --configuration=production
npx nx run app:build --skip-nx-cache --configuration=production
npx nx run landing:build --skip-nx-cache --configuration=production
```

### 3.2 Run Tests

```bash
npx nx test api
```

### 3.3 Verify Docker Builds (optional)

```bash
docker build -f docker/api/Dockerfile --target production -t iqon-api:test .
docker build -f docker/app/Dockerfile --target production -t iqon-app:test .
docker build -f docker/landing/Dockerfile --target production -t iqon-landing:test .
```

---

## 4. Database Setup

### 4.1 Run Migrations

```bash
npm run db:migrate
```

Runs all `docker/postgres/migrations/00X_*.sql` files sequentially.

### 4.2 Run Cleanup (purge seed data)

```bash
ADMIN_EMAIL=admin@yourdomain.com \
ADMIN_PASSWORD=your_secure_password_12_chars \
ADMIN_FIRST_NAME=Admin \
ADMIN_LAST_NAME=IQON \
npm run db:cleanup
```

**Result**: Empty database with a single `SUPER_ADMIN` user.

### 4.3 Verify Cleanup

```bash
# Connect to DB and check
psql $DATABASE_URL -c "SELECT id, email, role, status FROM users;"
# Expected: exactly 1 row — your super admin with role SUPER_ADMIN, status ACTIVE
```

---

## 5. External Services Configuration

### 5.1 Stripe (Test Mode)

- [ ] Create Stripe account / verify test mode is active
- [ ] Create products and prices matching config (B2C courses, B2B subscriptions)
- [ ] Configure webhook endpoint: `https://api.yourdomain.com/api/v1/payments/webhook`
- [ ] Enable webhook events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.*`
- [ ] Copy `sk_test_*`, `pk_test_*`, and `whsec_*` to `.env.production`

### 5.2 Mailjet

- [ ] Verify sender email address in Mailjet
- [ ] Create a Contact List for newsletter subscribers → copy list ID
- [ ] Copy API Key, Secret, and Contact List ID to `.env.production`

### 5.3 Cloudflare R2 + Stream

- [ ] Create R2 bucket (e.g. `iqon-ia-assets`)
- [ ] Configure public access / custom domain for R2
- [ ] Create API token with R2 + Stream permissions
- [ ] Configure Stream webhook URL: `https://api.yourdomain.com/api/v1/webhooks/cloudflare-stream`

### 5.4 OAuth / SSO (optional, tenant-scoped)

- [ ] Register Google OAuth app with production callback URL
- [ ] Register Microsoft Entra app with production callback URL

---

## 6. Email Testing

Once the API is running with `EMAIL_PROVIDER=mailjet`:

### 6.1 Test via Admin Endpoint

Log in as super admin, then send test emails for each template:

```bash
TOKEN="your_access_token_cookie_value"

# Generic test email
curl -X POST https://api.yourdomain.com/api/v1/admin/email/test \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$TOKEN" \
  -d '{"to": "your_email@example.com", "type": "test"}'

# Available types:
#   test, verification, password_reset, invitation,
#   notification_lesson_completed, notification_course_completed,
#   notification_badge_earned, digest
```

### 6.2 Check Email Delivery

```bash
# Stats for last 7 days
curl "https://api.yourdomain.com/api/v1/admin/email/stats?days=7" \
  -H "Cookie: accessToken=$TOKEN"

# Recent logs
curl "https://api.yourdomain.com/api/v1/admin/email/logs?limit=20" \
  -H "Cookie: accessToken=$TOKEN"
```

### 6.3 Test Real Flows

- [ ] Register a new user → verification email arrives
- [ ] Trigger "Forgot Password" → reset email arrives
- [ ] Invite a member (B2B) → invitation email arrives
- [ ] Subscribe on landing `/coming-soon` → contact appears in Mailjet list

---

## 7. Health Checks

After deployment, verify services are healthy:

```bash
# Basic liveness
curl https://api.yourdomain.com/api/v1/health
# Expected: { "success": true, "data": { "status": "healthy", ... } }

# Readiness (DB + Redis)
curl https://api.yourdomain.com/api/v1/health/ready
# Expected: { "success": true, "data": { "status": "ready", "checks": { "database": true, "redis": true } } }
```

---

## 8. Post-Deploy Verification

### 8.1 Landing Page

- [ ] Homepage loads correctly (EN + FR)
- [ ] All CTA buttons lead to `/coming-soon` (newsletter signup)
- [ ] Newsletter form submits correctly and contact appears in Mailjet
- [ ] 404 page works (visit `/nonexistent-page`)
- [ ] Mobile responsive OK
- [ ] Cookie consent banner works

### 8.2 App (Vue)

- [ ] Login page loads at `/login`
- [ ] Super admin can log in with cleanup credentials
- [ ] Dashboard loads correctly
- [ ] 404 page works for unknown routes
- [ ] i18n switching (EN/FR) works
- [ ] Dark mode toggle works

### 8.3 API

- [ ] Health check returns OK (section 7)
- [ ] CORS rejects unauthorized origins
- [ ] Rate limiting is active (test rapid requests → 429)
- [ ] Stripe webhook responds (test via Stripe CLI: `stripe listen --forward-to`)

---

## 9. Backup & Monitoring

- [ ] Create backup script (cron + `pg_dump` → R2 via rclone)
- [ ] API logs accessible (`docker compose logs -f api`)
- [ ] Email delivery stats visible via admin endpoint
- [ ] Stripe dashboard shows webhook deliveries
- [ ] Optional: Sentry DSN for error tracking
- [ ] Optional: UptimeRobot on `/api/v1/health/ready`

---

## 10. CTA Reactivation (when ready for public sign-ups)

When the platform is ready for public registrations, revert all `/coming-soon` links:

### Files to update:

| File (EN)                               | Occurrences |
| --------------------------------------- | ----------- |
| `apps/landing/src/pages/index.astro`    | 5           |
| `apps/landing/src/pages/features.astro` | 2           |
| `apps/landing/src/pages/pricing.astro`  | 3           |
| `apps/landing/src/pages/faq.astro`      | 1           |
| `apps/landing/src/pages/about.astro`    | 1           |
| `apps/landing/src/layouts/Layout.astro` | 2           |

| File (FR)                                  | Occurrences |
| ------------------------------------------ | ----------- |
| `apps/landing/src/pages/fr/index.astro`    | 5           |
| `apps/landing/src/pages/fr/features.astro` | 2           |
| `apps/landing/src/pages/fr/pricing.astro`  | 3           |
| `apps/landing/src/pages/fr/faq.astro`      | 1           |
| `apps/landing/src/pages/fr/about.astro`    | 1           |

### Quick revert command:

```bash
# EN pages
find apps/landing/src/pages -maxdepth 1 -name "*.astro" ! -name "coming-soon.astro" \
  -exec sed -i '' 's|/coming-soon|/app/register|g' {} +

# FR pages
find apps/landing/src/pages/fr -maxdepth 1 -name "*.astro" ! -name "coming-soon.astro" \
  -exec sed -i '' 's|/fr/coming-soon|/app/register|g' {} +

# Layout header/footer
sed -i '' "s|getLocalizedPath('/coming-soon', lang)|'/app/register'|g" \
  apps/landing/src/layouts/Layout.astro
```

---

## 11. deploy.yml — Fill in Deployment Commands

The `.github/workflows/deploy.yml` has TODO stubs. Update with actual commands:

**For SSH-based deployment** (single VPS):

```yaml
- name: Deploy
  run: |
    ssh -o StrictHostKeyChecking=no ${{ secrets.DEPLOY_SSH_USER }}@${{ secrets.DEPLOY_SSH_HOST }} << 'EOF'
      cd /opt/iqon-ia
      docker compose -f docker-compose.prod.yml pull
      docker compose -f docker-compose.prod.yml up -d --remove-orphans
      docker compose exec api npm run db:migrate
    EOF
```

**Required GitHub Secrets**:

- `DEPLOY_SSH_USER` / `DEPLOY_SSH_HOST`
- `PRODUCTION_DATABASE_URL`

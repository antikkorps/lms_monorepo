# IQON-IA — Deployment Runbook

> **Operational** guide: how to deploy, migrate, verify, roll back, and
> troubleshoot the production stack day-to-day.
>
> Companion docs:
> - [`DEPLOYMENT.md`](./DEPLOYMENT.md) — high-level strategy / architecture
> - [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md) — one-time pre-launch checklist (env vars, external services, post-deploy QA)
>
> This runbook is the **how-to-operate** reference. Use the checklist once before go-live; use this on every deploy.

---

## 1. Topology (what runs where)

```
Cloudflare edge (TLS) ──► Cloudflare Tunnel (cloudflared container)
                                   │
                                 Caddy (HTTP reverse proxy, auto_https off)
                                   │
              ┌────────────────────┼────────────────────┐
            landing:80           app:80               api:3000
                                                         │
                                              postgres (pgvector pg16) + redis
                                                         │
                                              backup (pg_dump → R2 via rclone)
```

- **Host**: Hetzner VPS. Repo checked out at **`/opt/iqon-ia`**.
- **Compose file**: `deploy/docker-compose.prod.yml`.
- **Env file**: `deploy/.env.production` (copy of `deploy/.env.production.example`, filled with real secrets — **never committed**).
- **TLS**: terminated at Cloudflare. Caddy speaks plain HTTP internally (`auto_https off`). No ports are exposed on the host — all ingress flows through the Cloudflare Tunnel.
- Images are **built on the server** (`build:` in compose), not pulled from a registry.

---

## 2. Routine deploy (current method — manual SSH)

> This is the supported path today. CI auto-deploy exists but is **not yet
> enabled** (see §7).

SSH into the VPS, then from the repo root:

```bash
cd /opt/iqon-ia

# 1. Pull the latest main
git pull origin main

# 2. Rebuild changed images (--env-file is REQUIRED — see §6.2)
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production \
  build --parallel

# 3. Recreate containers
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production \
  up -d --remove-orphans

# 4. Apply DB migrations (idempotent — tracked in schema_migrations)
#    Prod runs the COMPILED migrator (no tsx in the image) — see §3.
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production \
  exec -T api node database/migrator.mjs

# 5. Reclaim disk from dangling images
docker image prune -f
```

Then run the health checks in §4.

> **Note on `--env-file`**: the per-service `env_file: .env.production` only
> injects vars **into containers**. Compose-level `${...}` interpolations
> (e.g. `CLOUDFLARE_TUNNEL_TOKEN`, `VITE_STRIPE_PUBLISHABLE_KEY` build arg,
> the `backup` service's `POSTGRES_*`/`R2_*`) need the top-level
> `--env-file deploy/.env.production`. Omitting it silently yields empty
> values (broken tunnel, missing Stripe key in the built app).

---

## 3. Database migrations

The migrator applies SQL files from `docker/postgres/migrations/00X_*.sql`
sequentially, tracking applied files in a `schema_migrations` table and using a
PostgreSQL advisory lock to prevent concurrent runs. It is **safe to re-run** —
already applied migrations are skipped.

> **Prod vs dev:** the production image ships **compiled** code (no TS source,
> no `tsx`), so it runs the bundled `database/migrator.mjs`. The dev command
> `npm run db:migrate` (`npx tsx apps/api/src/database/migrator.ts`) only works
> in a checkout and fails in the container with `ERR_MODULE_NOT_FOUND`.
> `MIGRATIONS_DIR=/app/migrations` is baked into the image.

```bash
# Apply pending migrations (inside the running api container)
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production \
  exec -T api node database/migrator.mjs

# Show migration status without applying
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production \
  exec -T api node database/migrator.mjs status
```

First-time / fresh DB only: see `DEPLOYMENT_CHECKLIST.md` §4 for the
`db:cleanup` step that seeds a single `SUPER_ADMIN`.

---

## 4. Health checks

```bash
# Liveness
curl https://api.iqon-ia.com/api/v1/health
# Expected: { "success": true, "data": { "status": "healthy", ... } }

# Readiness (DB + Redis)
curl https://api.iqon-ia.com/api/v1/health/ready
# Expected: { ..., "checks": { "database": true, "redis": true } }

# Public surfaces
curl -I https://app.iqon-ia.com
curl -I https://iqon-ia.com
```

Container-level health:

```bash
docker compose -f deploy/docker-compose.prod.yml ps
# postgres / redis / api should report (healthy)
```

---

## 5. Observability & operations

```bash
# Service status
docker compose -f deploy/docker-compose.prod.yml ps

# Tail logs (single service)
docker compose -f deploy/docker-compose.prod.yml logs -f --tail=100 api

# All services
docker compose -f deploy/docker-compose.prod.yml logs -f --tail=50

# Restart one service
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production \
  restart api

# Shell into a container
docker compose -f deploy/docker-compose.prod.yml exec api sh
```

### 5.1 Backups (pg_dump → R2)

The `backup` service holds the `PG*` and `RCLONE_CONFIG_R2_*` env and runs
`deploy/scripts/backup.sh` (dump → gzip → `rclone copy` to
`r2:<bucket>/backups/postgres/`, with `BACKUP_RETENTION_DAYS` retention,
default 30).

```bash
# Trigger an on-demand backup
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production \
  exec backup /scripts/backup.sh   # adjust path to backup.sh inside the image

# List available backups
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production \
  exec backup /scripts/restore.sh

# Restore a specific backup (DESTRUCTIVE — see §6.1)
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production \
  exec backup /scripts/restore.sh lms-backup-YYYY-MM-DD-HHMMSS.sql.gz
```

---

## 6. Rollback

### 6.1 Application rollback (bad deploy)

```bash
cd /opt/iqon-ia

# Find the last-good commit/tag
git log --oneline -10

# Check it out and rebuild
git checkout <good-sha>
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production \
  up -d --build --remove-orphans
```

> Migrations are **not auto-reverted**. The migrator is forward-only. If a bad
> migration shipped, restore from a pre-deploy backup (`restore.sh`, §5.1) —
> `restore.sh` runs inside a single transaction, so a failed restore rolls back.
> Take a fresh backup **before** any risky migration.

### 6.2 Quick sanity if a deploy "looks empty"

If the site is up but the tunnel is down, the app is missing its Stripe key,
or the `backup` service errors on startup — you almost certainly forgot the
top-level `--env-file deploy/.env.production` (see §2 note). Re-run `up -d`
with it.

---

## 7. Enabling CI auto-deploy (when ready)

`.github/workflows/deploy.yml` already encodes this exact flow (deploy →
migrate → health-check) on push to `main` (+ `workflow_dispatch`), gated to the
`production` GitHub Environment. It is **not active** yet. To turn it on:

### 7.1 Add the three environment secrets

The workflow reads `DEPLOY_SSH_HOST`, `DEPLOY_SSH_USER`, `DEPLOY_SSH_KEY` from
the **`production`** environment. They are currently **unset** — which is why a
manual run fails with `error: missing server host`.

```bash
gh secret set DEPLOY_SSH_HOST --env production --body "<hetzner-ip-or-host>"
gh secret set DEPLOY_SSH_USER --env production --body "<ssh-user>"
gh secret set DEPLOY_SSH_KEY  --env production < ~/.ssh/<deploy_private_key>
```

- `DEPLOY_SSH_KEY` is the **private** key (full file, BEGIN…END); its public
  half must be in the SSH user's `~/.ssh/authorized_keys` on the VPS.
- Pass the key via `< file` redirection to preserve newlines.

### 7.2 Fix `deploy.yml` before relying on it

The current workflow script runs `docker compose ... build` / `up` **without**
`--env-file deploy/.env.production`. As written, compose-level interpolations
(tunnel token, Stripe build arg, backup vars) will be empty. Before enabling,
patch the `script:` steps to add `--env-file deploy/.env.production` to the
`build` and `up` commands (matching §2).

### 7.3 Confirm the environment's branch policy

The `production` environment should restrict deployments to `main`. A
`workflow_dispatch` from another branch won't receive environment secrets.

---

## 8. Known gaps (as of 2026-06-04)

- [ ] **CI deploy not enabled** — secrets unset + missing `--env-file` (§7).
- [ ] **`CLOUDFLARE_TUNNEL_TOKEN` absent from `deploy/.env.production.example`** —
  the compose `cloudflared` service interpolates `${CLOUDFLARE_TUNNEL_TOKEN}`,
  but the example template doesn't list it. Add it to the template and to the
  real `.env.production`. (Note: `deploy/cloudflared/config.yml` describes a
  credentials-file tunnel, but the compose uses the **token** flow — the
  config.yml is unused by the current setup.)
- [ ] **Stale references**: `DEPLOYMENT.md` still lists a "Files to Create"
  TODO that is now fully done, and `DEPLOYMENT_CHECKLIST.md` §11 describes a
  GHCR-pull + `npm run db:migrate` deploy that does **not** match the real
  `deploy.yml` (build-on-server + in-container migrator). Reconcile when
  convenient.

---

## Quick reference

```bash
cd /opt/iqon-ia
C="docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production"

git pull origin main
$C build --parallel
$C up -d --remove-orphans
$C exec -T api node database/migrator.mjs
docker image prune -f
curl -s https://api.iqon-ia.com/api/v1/health/ready
```

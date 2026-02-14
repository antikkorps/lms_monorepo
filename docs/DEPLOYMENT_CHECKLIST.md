# Infrastructure - Deployment Checklist

## Created: 2026-02-14
## Target: 2026-02-15 (dev deployment)

---

### Docker & Reverse Proxy

- [ ] Create `deploy/docker-compose.prod.yml` (api, app, landing, postgres, redis, caddy)
- [ ] Create `deploy/Caddyfile` (reverse proxy: landing, app, api)
- [ ] Create `deploy/cloudflared/config.yml` (Cloudflare Tunnel)
- [ ] Create `.env.production.example` with all required vars documented

### Server Provisioning

- [ ] Provision Hetzner VPS
- [ ] Configure Cloudflare DNS + Tunnel
- [ ] Setup R2 buckets (storage + backups)

### Backup & Data

- [ ] Create backup script (cron + rclone → R2)
- [ ] Run schema + migrations on production DB
- [ ] Load seed data OR run cleanup + create superadmin

### Verification

- [ ] Verify all services start correctly
- [ ] Test end-to-end: landing → coming soon → app login → dashboard

---

### Notes

- Caddy handles automatic HTTPS via Cloudflare DNS challenge
- Cloudflare Tunnel exposes services without opening ports
- R2 for both file storage and DB backup retention
- `.env.production.example` documents every required variable with descriptions

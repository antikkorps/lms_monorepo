# Deployment Strategy

## Target Date
Mid-February 2026 (within ~15 days from 2026-01-20)

## Infrastructure

### Hosting
- **Provider**: Hetzner (VPS)
- **Architecture**: Full Docker deployment

### Stack
```
Cloudflare Tunnel (cloudflared)
       ↓
     Caddy (internal reverse proxy)
       ↓
  ┌────┴────┐
  api  app  landing
       ↓
  postgres + redis
       ↓
  Backup → Cloudflare R2
```

### Components
| Component | Solution |
|-----------|----------|
| Reverse Proxy | Caddy (internal routing, no SSL needed) |
| Tunnel | Cloudflare Tunnel (cloudflared) |
| Database | PostgreSQL (Docker) |
| Cache | Redis (Docker) |
| Backups | PostgreSQL dumps → Cloudflare R2 |
| DDoS/CDN | Cloudflare (via tunnel) |

### Why This Stack
- **Cloudflare Tunnel**: Zero exposed ports, no SSL management, DDoS protection included
- **Caddy**: Simple config, internal routing only
- **Hetzner**: Good price/performance ratio
- **R2**: S3-compatible, no egress fees, integrated with Cloudflare

## Files to Create

```
deploy/
├── docker-compose.prod.yml    # Production compose file
├── Caddyfile                  # Internal reverse proxy config
├── cloudflared/
│   └── config.yml             # Tunnel configuration
├── scripts/
│   ├── backup.sh              # PostgreSQL backup to R2
│   └── restore.sh             # Restore from R2
└── .env.production.example    # Environment template
```

## GitHub Actions
- Deploy workflow (SSH or Docker registry push)
- Triggered on merge to `main`

## TODO
- [ ] Create `deploy/` folder structure
- [ ] Write `docker-compose.prod.yml`
- [ ] Configure Caddyfile for internal routing
- [ ] Setup Cloudflare Tunnel config
- [ ] Write backup script (cron + rclone/mc → R2)
- [ ] Create `.env.production.example`
- [ ] Add deploy workflow to GitHub Actions
- [ ] Setup Hetzner VPS
- [ ] Configure Cloudflare DNS + Tunnel
- [ ] Test staging deployment
- [ ] Document rollback procedure

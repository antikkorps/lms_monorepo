# API - Phase 2: Authentication & Security

## Modified: 2026-01-14

### Pending
- [ ] Implement JWT authentication middleware
- [ ] Create login/register endpoints
- [ ] Setup HTTP-Only cookie token storage
- [ ] Implement refresh token rotation
- [ ] Create password reset flow
- [ ] Implement user invitation system (Solo/Pro)
- [ ] Setup Redis session blacklist for token revocation
- [ ] Implement CheckAccess middleware for resource validation
- [ ] Create RBAC permission system
- [ ] Setup SSO integration (OAuth2/OpenID Connect)
- [ ] Implement session fingerprinting (optional)

### Notes
- JWT contains only identity (userId, role)
- Stateful validation via Redis for real-time access control
- Support both B2C (Solo) and B2B (Enterprise) auth flows

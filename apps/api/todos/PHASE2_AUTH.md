# API - Phase 2: Authentication & Security

## Modified: 2026-02-01

### Completed

- [x] Implement JWT authentication middleware (Done: 2026-01-14)
- [x] Create login/register endpoints (Done: 2026-01-14)
- [x] Setup HTTP-Only cookie token storage (Done: 2026-01-14)
- [x] Implement refresh token rotation (Done: 2026-01-14)
- [x] Setup Redis session blacklist for token revocation (Done: 2026-01-14)
- [x] Create RBAC permission system (requireRole, requireSuperAdmin) (Done: 2026-01-14)
- [x] Implement password hashing with bcryptjs (Done: 2026-01-14)
- [x] Add password strength validation (Done: 2026-01-14)
- [x] Create change password endpoint (Done: 2026-01-14)
- [x] Implement logout & logout-all endpoints (Done: 2026-01-14)
- [x] Create password reset flow (forgot-password, reset-password) (Done: 2026-01-14)
- [x] Add email verification on registration (verify-email, resend-verification) (Done: 2026-01-14)
- [x] Implement user invitation system (Done: 2026-01-15)
- [x] Implement email service with Circuit Breaker (Done: 2026-01-15)
- [x] Add unit tests for auth, invitations & email (108 tests) (Done: 2026-01-15)
- [x] Setup SSO integration - Google, Microsoft, OIDC générique (Done: 2026-01-18)
- [x] Add i18n (FR/EN) support for auth emails - verification, password-reset, invitation (Done: 2026-02-01)

### Pending

- [ ] Implement session fingerprinting (optional)

### Notes

- JWT contains only identity (userId, email, role, tenantId)
- Access token: 15 min expiry (configurable via JWT_ACCESS_EXPIRES_IN)
- Refresh token: 7 days expiry with rotation
- Stateful validation via Redis for real-time access control
- Support both B2C (Solo) and B2B (Enterprise) auth flows
- Auth rate limiting: 10 requests per minute

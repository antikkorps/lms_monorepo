# App (Vue) - Deployment Preparation

## Created: 2026-02-14
## Target: 2026-02-15 (dev deployment)

---

### New Views

- [x] Create AcceptInvitationView.vue (`/invitations/:token` route) (Done: 2026-02-15)
- [x] Add invitation i18n keys (EN/FR) (Done: 2026-02-15)

### Auth Flow Verification

- [x] Fix register page — add shared password validation (strength rules: uppercase, lowercase, digit, special char) via `lib/password-validation.ts` (Done: 2026-02-19)
- [x] Fix AcceptInvitationView — same shared password validation (DRY) (Done: 2026-02-19)
- [x] Fix VerifyEmailView — auto-load user from verify response, redirect to dashboard if authenticated (Done: 2026-02-19)
- [ ] Live test register page end-to-end
- [ ] Live test login page end-to-end
- [ ] Live test email verification page end-to-end

### Error Handling

- [x] Add 404 page (catch-all route) (Already existed: NotFoundView.vue)

---

### Notes

- AcceptInvitationView handles token validation, displays tenant/role info, and submits acceptance
- 404 page includes navigation back to home

# App (Vue) - Deployment Preparation

## Created: 2026-02-14
## Target: 2026-02-15 (dev deployment)

---

### New Views

- [ ] Create AcceptInvitationView.vue (`/invitations/:token` route)
- [ ] Add invitation i18n keys (EN/FR)

### Auth Flow Verification

- [ ] Verify register page works correctly
- [ ] Verify login page works correctly
- [ ] Verify email verification page works correctly

### Error Handling

- [ ] Add 404 page (catch-all route)

---

### Notes

- AcceptInvitationView must handle token validation, display tenant/role info, and submit acceptance
- 404 page should include navigation back to home/dashboard

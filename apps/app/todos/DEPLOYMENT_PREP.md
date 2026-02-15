# App (Vue) - Deployment Preparation

## Created: 2026-02-14
## Target: 2026-02-15 (dev deployment)

---

### New Views

- [x] Create AcceptInvitationView.vue (`/invitations/:token` route) (Done: 2026-02-15)
- [x] Add invitation i18n keys (EN/FR) (Done: 2026-02-15)

### Auth Flow Verification

- [ ] Verify register page works correctly
- [ ] Verify login page works correctly
- [ ] Verify email verification page works correctly

### Error Handling

- [x] Add 404 page (catch-all route) (Already existed: NotFoundView.vue)

---

### Notes

- AcceptInvitationView handles token validation, displays tenant/role info, and submits acceptance
- 404 page includes navigation back to home
